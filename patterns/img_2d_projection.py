import argparse
import numpy as np 
import sys
from python_utils import Zome, transform_to_byte_str
from PIL import Image
import os.path 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def pattern(zome):
    total_time_sec = 5 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    # topZ = zome.height()
    max_x = zome.width_x()
    max_y = zome.width_y()
    alpha = 255 #TODO: can be a variable 
    frame_id = 0
    img_dir = os.path.dirname(__file__) + '/../media/'
    X = np.array(zome.pixels)[:,0]
    Y = np.array(zome.pixels)[:,1]
    while True: 
        for f in os.listdir(img_dir):
            if not (f.endswith('jpeg') or f.endswith('png') or f.endswith('jpg')):
                continue
            img_path = os.path.join(img_dir, f)
            img = np.asarray(Image.open(img_path))
            img_dim = img.shape
            img_center = np.array(img.shape)/2.0
            
            for _ in range(total_frames):
                zoom_factor = min([1, 0.5+np.sqrt((frame_id % total_frames) / total_frames)]) # how much the img zoom in 
                rotate_angle = np.sin(frame_id / zome.fps) # how much the img rotate
                rotation_matrix = np.array([[np.cos(rotate_angle), -np.sin(rotate_angle)],
                                [np.sin(rotate_angle), np.cos(rotate_angle)]])
                rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
                zoomed_width = int(img_dim[0] * zoom_factor)
                zoomed_height = int(img_dim[1] * zoom_factor)
                zoomed_x = int(img_center[0] - zoomed_width / 2)
                zoomed_y = int(img_center[1] - zoomed_height / 2)

                zoomed_img = img[zoomed_y:zoomed_y + zoomed_height, zoomed_x:zoomed_x + zoomed_width]
                zoomed_img_dim = zoomed_img.shape 

                # import pdb;pdb.set_trace()
                ind_X = (X + max_x)/(2*max_x) * zoomed_img_dim[0]
                ind_Y = (Y + max_y)/(2*max_y) * zoomed_img_dim[1]
                rotate_indices = np.dot(rotation_matrix, np.stack([ind_X, ind_Y])).T
                rotate_indices = rotate_indices.astype(int)
                rotate_indices[rotate_indices < 0] = 0
                rotate_indices[rotate_indices[:,0] >= zoomed_img_dim[0]] = zoomed_img_dim[0]-1
                rotate_indices[rotate_indices[:,1] >= zoomed_img_dim[1]] = zoomed_img_dim[1]-1 

                color = zoomed_img[rotate_indices[:,0], rotate_indices[:,1]]
                alpha_values = np.ones((zome.num_pixels,1)).astype(int) * alpha
                rgba_values = np.concatenate((color, alpha_values), axis=1)
                # for i, p in enumerate(zome.pixels):
                #     ind_x = int(min([zoomed_img_dim[0], (p[0] + max_x)/(2*max_x) * zoomed_img_dim[0]]))
                #     ind_y = int(min([zoomed_img_dim[1], (p[1] + max_y)/(2*max_y) * zoomed_img_dim[1]]))
                #     rotate_indices = np.dot(rotation_matrix, [ind_x, ind_y])
                #     new_ind_x = int(min([rotate_indices[0], img_dim[0]-1] ))
                #     new_ind_y = int(min([rotate_indices[1], img_dim[1]-1] ))
                #     color = img[new_ind_x, new_ind_y]
                #     rgba_values[i] = list(color) + [alpha] # combine the RGB, and alpha
                msg = transform_to_byte_str(frame_id, rgba_values)
                sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
                frame_id += 1

if __name__ == "__main__":
    zome = Zome(args.model_file)
    pattern(zome=zome)
