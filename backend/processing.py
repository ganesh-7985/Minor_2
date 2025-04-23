import os
import cv2
import numpy as np
import time
import logging
import uuid
from ultralytics import YOLO
from typing import Tuple

from config import (
    YOLO_MODEL_PATH, YOLO_NAMES_PATH, MOTION_THRESHOLD, MOTION_AREA_THRESHOLD,
    RECORD_TIMEOUT, CONFIDENCE_THRESHOLD, OUTPUT_DIR
)


def load_yolo_model():
    return YOLO(YOLO_MODEL_PATH)


def load_classes():
    with open(YOLO_NAMES_PATH, "r") as f:
        return [line.strip() for line in f.readlines()]


def detect_motion(prev_gray, curr_gray):
    diff   = cv2.absdiff(prev_gray, curr_gray)
    _, th  = cv2.threshold(diff, MOTION_THRESHOLD, 255, cv2.THRESH_BINARY)
    dil    = cv2.dilate(th, None, iterations=2)
    return cv2.countNonZero(dil) > MOTION_AREA_THRESHOLD, dil


def detect_objects_yolo(model, frame, classes,
                        conf_threshold=CONFIDENCE_THRESHOLD):
    wanted = {"person", "bicycle", "car", "motorcycle", "bus", "truck"}
    results = model(frame)
    detections = []
    for res in results:
        for box in res.boxes:
            conf = float(box.conf)
            if conf < conf_threshold:
                continue
            cls_id = int(box.cls[0])
            label  = classes[cls_id]
            if label not in wanted:
                continue
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            detections.append({
                "label": label, "confidence": conf,
                "box": [int(x1), int(y1), int(x2), int(y2)]
            })
    return detections



def process_video(video_path: str) -> Tuple[list, str]:
    """
    Exactly what already worked for you – kept verbatim.
    """
    logging.basicConfig(level=logging.INFO)
    model   = load_yolo_model()
    classes = load_classes()

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Cannot open video file")

    fps    = cap.get(cv2.CAP_PROP_FPS) or 25
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    recording               = False
    last_detection_video_ts = None
    logs, recorded_frames   = [], []
    frame_idx               = 0

    ok, frame = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError("Failed to read first frame")
    prev_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    while ok:
        ok, frame = cap.read()
        if not ok:
            break
        frame_idx += 1
        video_ts   = frame_idx / fps

        curr_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        motion, _ = detect_motion(prev_gray, curr_gray)
        prev_gray = curr_gray

        if motion:
            objs = detect_objects_yolo(model, frame, classes)
            if objs:
                t = time.strftime("%H:%M:%S", time.gmtime(video_ts))
                last_detection_video_ts = video_ts
                if not recording:
                    logs.append(f"{t} - Started recording")
                    recording = True
                recorded_frames.append(frame.copy())
            elif recording:
                recorded_frames.append(frame.copy())
        else:
            if recording and last_detection_video_ts is not None \
               and video_ts - last_detection_video_ts > RECORD_TIMEOUT:
                t = time.strftime("%H:%M:%S", time.gmtime(video_ts))
                logs.append(f"{t} - Stopped recording")
                recording = False
            elif recording:
                recorded_frames.append(frame.copy())

    cap.release()
    if recording:
        t = time.strftime("%H:%M:%S", time.gmtime(video_ts))
        logs.append(f"{t} - Stopped recording")

    output_path = os.path.join(OUTPUT_DIR, f"{uuid.uuid4().hex}_summary.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    for fr in recorded_frames:
        writer.write(fr)
    writer.release()

    return logs, output_path