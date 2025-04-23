import cv2
import numpy as np

# Path to your video file
video_path = './input/input1.mp4'

# Open the video file
cap = cv2.VideoCapture(video_path)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

# Initialize variables for summing frames and counting them
frame_count = 0
accumulator = None

while True:
    ret, frame = cap.read()
    if not ret:
        break  # End of video

    # Convert frame to float32 for accumulation to prevent overflow
    frame_float = frame.astype(np.float32)

    if accumulator is None:
        accumulator = frame_float
    else:
        accumulator += frame_float

    frame_count += 1

cap.release()

if frame_count == 0:
    print("Error: No frames read from video.")
    exit()

# Compute the average frame
average_frame = accumulator / frame_count

# Convert the averaged frame back to uint8
average_frame_uint8 = cv2.convertScaleAbs(average_frame)

# Save the averaged frame to a file
output_image_path = 'average_frame.jpg'
cv2.imwrite(output_image_path, average_frame_uint8)

print(f"Average frame computed over {frame_count} frames and saved as '{output_image_path}'.")
