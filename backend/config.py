import os

# Configuration constants
YOLO_MODEL_PATH = './yolo/yolov8n.pt'
YOLO_NAMES_PATH = './yolo/coco.names'


OUTPUT_DIR = "./output"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)


MOTION_THRESHOLD      = 25
MOTION_AREA_THRESHOLD = 2_000
CONFIDENCE_THRESHOLD  = 0.25
RECORD_TIMEOUT        = 5         