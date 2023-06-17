import argparse
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str
from PIL import Image
import os.path 
import cv2 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def generate_transformed_img(img, angle, scale):
    transformed_img = np.zeros_like(img)
    img_dim = img.shape
    img_center = [img_dim[0]//2, img_dim[1]//2]
    T = cv2.getRotationMatrix2D(img_center, angle, scale)
    for x in range(img_dim[0]):
        for y in range(img_dim[1]):
            # Calculate the new coordinates of the pixel
            new_x, new_y = np.dot(T, [x, y, 1])
            # Round the coordinates to the nearest integer
            new_x = int(round(new_x))
            new_y = int(round(new_y))
            # Check if the new coordinates are within the image boundaries
            if 0 <= new_x < img_dim[0] and 0 <= new_y < img_dim[1]:
                # Copy the pixel value from the original image to the transformed image
                transformed_img[x, y] = img[x, y]
    return transformed_img


def pattern(zome):
    total_time_sec = 5 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    # topZ = zome.height
    max_x = zome.width_x
    max_y = zome.width_y
    alpha = 255 #TODO: can be a variable 
    frame_id = 0
    img_dir = os.path.dirname(__file__) + '/../media/'
    for f in os.listdir(img_dir):
        if not (f.endswith('jpeg') or f.endswith('png') or f.endswith('jpg')):
            continue
        img_path = os.path.join(img_dir, f)
        img = np.asarray(Image.open(img_path))
        for _ in range(total_frames):
            scale = min([1, 0.1+np.sqrt((frame_id % total_frames) / total_frames)]) # how much the img zoom in 
            rotate_angle = np.sin(frame_id / zome.fps) # how much the img rotate
            transformed_img = generate_transformed_img(img=img, angle=rotate_angle, scale=scale)
            transformed_img_dim = transformed_img.shape
            rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
            for i, p in enumerate(zome.pixels):
                ind_x = int(min([transformed_img_dim[0], (p[0] + max_x)/(2*max_x) * transformed_img_dim[0]]))
                ind_y = int(min([transformed_img_dim[1], (p[1] + max_y)/(2*max_y) * transformed_img_dim[1]]))
                color = transformed_img[ind_x, ind_y]
                rgba_values[i] = list(color) + [alpha] # combine the RGB, and alpha
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
            frame_id += 1

if __name__ == "__main__":
    zome = Zome(args.model_file)
    pattern(zome=zome)
