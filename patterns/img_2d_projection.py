import argparse
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str
from PIL import Image
import os.path 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def pattern(zome, img):
    total_time_sec = 5 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    # topZ = zome.height()
    max_x = zome.width_x()
    max_y = zome.width_y()
    img_dim = img.shape
    alpha = 255 #TODO: can be a variable 
    frame_id = 0
    while True:
        for _ in range(total_frames):
            zoom_factor = np.sqrt((frame_id % total_frames) / total_frames )
            rotate_angle = np.sin(frame_id / zome.fps)
            rotation_matrix = np.array([[np.cos(rotate_angle), -np.sin(rotate_angle)],
                            [np.sin(rotate_angle), np.cos(rotate_angle)]])

            rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
            for i, p in enumerate(zome.pixels):
                ind_x = (p[0] + max_x)/(2*max_x)  * img_dim[0] * zoom_factor
                ind_y = (p[1] + max_y)/(2*max_y)  * img_dim[1] * zoom_factor
                rotate_indices = np.dot(rotation_matrix, [ind_x, ind_y])
                new_ind_x = int(min([img_dim[0]-1, rotate_indices[0]]))
                new_ind_y = int(min([img_dim[1]-1, rotate_indices[1]]))
                color = img[new_ind_x, new_ind_y]
                rgba_values[i] = list(color) + [alpha] # combine the RGB, and alpha
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg)
            frame_id += 1


if __name__ == "__main__":
    sys.stderr.write(f"loading file {args.model_file}\n")
    zome = Zome(args.model_file)
    img_path = os.path.dirname(__file__) + '/../media/rainbow_0.jpeg'
    img = np.asarray(Image.open(img_path))
    pattern(zome=zome, img=img)
