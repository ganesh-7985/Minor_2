import os, uuid, shutil, time, logging
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from config import OUTPUT_DIR
from processing import process_video
# from realtime_processor import LiveCaptureManager
from live import LiveCaptureManager


app = FastAPI(title="CCTV Optimiser API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# ───────────────────────────────────────── recorded file
@app.post("/process-video")
async def process_video_ep(file: UploadFile = File(...)):
    try:
        fn = os.path.join(OUTPUT_DIR, f"{uuid.uuid4().hex}_{file.filename}")
        with open(fn, "wb") as f: shutil.copyfileobj(file.file, f)
        logs, path = process_video(fn)
        os.remove(fn)
        return {"logs": logs, "summary_video": path}
    except Exception as e:
        logging.exception("process-video error")
        raise HTTPException(500, str(e))


@app.get("/download-video")
async def download_video(video_path: str):
    if os.path.exists(video_path):
        return FileResponse(video_path, media_type="video/mp4",
                            filename=os.path.basename(video_path))
    raise HTTPException(404, "Not found")

# ───────────────────────────────────────── live capture
manager = LiveCaptureManager()

@app.get("/process-live")
async def start_live(cam_index: int = 0):
    manager.start(cam_index)
    return {"status": "live capture started"}

def _mjpeg_generator():
    boundary = b"--frame"
    while manager.running:
        frame = manager.latest_jpeg()
        if frame:
            yield boundary + b"\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n"
        else:
            time.sleep(0.05)
    # stream ends when manager stops

@app.get("/stream-live")
async def stream_live():
    if not manager.running:
        manager.start()
    return StreamingResponse(_mjpeg_generator(),
                             media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/stop-live")
async def stop_live():
    logs, path = manager.stop()
    return {"logs": logs, "summary_video": path}

# ─────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)