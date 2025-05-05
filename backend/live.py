from __future__ import annotations
import os, cv2, time, uuid, threading, logging, platform
from typing import Tuple, List

from config import (
    OUTPUT_DIR, RECORD_TIMEOUT, CONFIDENCE_THRESHOLD
)
from processing import (
    load_yolo_model, load_classes, detect_objects_yolo
)

_JPEG_PARAMS = [int(cv2.IMWRITE_JPEG_QUALITY), 80]


# ────────────────────────────────────────────────────────────────
def _open_capture(index: int | str = 0) -> cv2.VideoCapture:
    """Return a VideoCapture opened with the proper backend for the host OS."""
    sys = platform.system()
    if sys == "Windows":
        return cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if sys == "Darwin":                        
        return cv2.VideoCapture(index, cv2.CAP_AVFOUNDATION)
    return cv2.VideoCapture(index)               


# ────────────────────────────────────────────────────────────────
class LiveCaptureManager:
    _inst: "LiveCaptureManager | None" = None

    def __new__(cls, *a, **kw):
        if cls._inst is None:
            cls._inst = super().__new__(cls)
        return cls._inst

    # ─────────────────────────
    def __init__(self):
        self._thr: threading.Thread | None = None
        self._stop_evt = threading.Event()
        self._frame_lock = threading.Lock()
        self._latest_jpeg: bytes | None = None
        self._logs: list[str] = []
        self._video_path: str = ""

    # public helpers ─────────────────────────
    @property
    def running(self) -> bool:
        return self._thr is not None and self._thr.is_alive()

    def latest_jpeg(self) -> bytes | None:
        with self._frame_lock:
            return self._latest_jpeg

    def start(self, cam_index: int | str = 0):
        if self.running:
            return
        self._stop_evt.clear()
        self._thr = threading.Thread(
            target=self._worker, args=(cam_index,), daemon=True
        )
        self._thr.start()

    def stop(self) -> Tuple[list[str], str]:
        """Stop capture; return (logs, summary_path)."""
        if not self.running:
            return [], ""
        self._stop_evt.set()
        self._thr.join()
        return self._logs, self._video_path

    # internal worker ─────────────────────────
    def _worker(self, cam_index):
        logging.info("LiveCapture: opening camera %s", cam_index)
        cap = _open_capture(cam_index)
        if not cap.isOpened():
            logging.error("Cannot open camera %s", cam_index)
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(
            cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
        )

        yolo, names = load_yolo_model(), load_classes()

        ok, frame = cap.read()
        if not ok:
            cap.release()
            logging.error("Camera feed empty")
            return

        # runtime state --------------------------------------------------
        recording = False                 # are we currently recording?
        last_obj_time = None              # wall‑clock time last wanted obj seen
        first_frame_time = None           # first kept frame time
        last_frame_time = None            # last kept frame time
        frames: List = []                 # stored frames
        self._logs, self._video_path = [], ""
        encode = cv2.imencode

        prev_gray = None  # ← previous grayscale frame for motion detection

        while not self._stop_evt.is_set():
            ok, frame = cap.read()
            if not ok:
                break

            now = time.time()
            wall_str = time.strftime("%H:%M:%S", time.localtime(now))

            # --- Motion Detection ---
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.GaussianBlur(gray, (21, 21), 0)

            motion_detected = False
            if prev_gray is not None:
                diff = cv2.absdiff(prev_gray, gray)
                thresh = cv2.threshold(diff, 25, 255, cv2.THRESH_BINARY)[1]
                thresh = cv2.dilate(thresh, None, iterations=2)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                for contour in contours:
                    if cv2.contourArea(contour) > 1000:  # Tune this area threshold
                        motion_detected = True
                        break

            prev_gray = gray.copy()

            # Only detect objects if motion is present
            wanted_present = False
            if motion_detected:
                objs = detect_objects_yolo(yolo, frame, names, CONFIDENCE_THRESHOLD)
                wanted_present = bool(objs)

            # ---- state machine (same as before) ----
            if wanted_present:
                last_obj_time = now
                if not recording:
                    self._logs.append(f"{wall_str} - Started recording")
                    recording = True

            if recording:
                frames.append(frame.copy())
                if first_frame_time is None:
                    first_frame_time = now
                last_frame_time = now
                if last_obj_time and (now - last_obj_time) >= RECORD_TIMEOUT:
                    self._logs.append(f"{wall_str} - Stopped recording")
                    recording = False

            # MJPEG preview
            ok_enc, buf = encode(".jpg", frame, _JPEG_PARAMS)
            if ok_enc:
                with self._frame_lock:
                    self._latest_jpeg = buf.tobytes()

        # ----------------------------------------------------------------
        cap.release()
        self._save_summary(frames, fps, w, h,
                           first_frame_time, last_frame_time, recording)
        logging.info("LiveCapture: finished")

    # helper to persist the summary --------------------------------------
    def _save_summary(
        self,
        frames: List,
        src_fps: float,
        width: int,
        height: int,
        first_t: float | None,
        last_t: float | None,
        recording_at_end: bool,
    ):
        if not frames:
            return

        # compute effective fps so playback speed is correct
        if first_t and last_t and last_t > first_t:
            elapsed = last_t - first_t
            eff_fps = max(1, round(len(frames) / elapsed))
        else:
            eff_fps = src_fps or 25

        out_path = os.path.join(
            OUTPUT_DIR, f"{uuid.uuid4().hex}_live_summary.mp4"
        )
        vw = cv2.VideoWriter(
            out_path, cv2.VideoWriter_fourcc(*"mp4v"), eff_fps, (width, height)
        )
        for f in frames:
            vw.write(f)
        vw.release()
        self._video_path = out_path

        if recording_at_end:
            self._logs.append(
                time.strftime("%H:%M:%S", time.localtime())
                + " - Stopped recording"
            )