import argparse
import numpy as np 
import sys
import os 
import colorsys
from python_utils import Zome, transform_to_byte_str
import random
import matplotlib as plt 

parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='models/model_file.json')


args = parser.parse_args()


def faces_pattern(zome):
    frame_id = 0
    # inside_strands_edges, outside_strands_edges = zome.get_inside_outside_strands_edges()
    inside_face_edges, outside_face_edges = zome.get_inside_outside_faces_edges()
    num_colors = 30
    color_id = 0
    color_map_names = random.choices(plt.colormaps(), k=num_colors)
    color_map = plt.colormaps.get_cmap(color_map_names[0])
    rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
    num_faces = len(inside_face_edges)
    is_reverse = False
    while True:
        sequence = np.arange(len(inside_face_edges)) if not is_reverse else np.arange(len(inside_face_edges))[::-1]

        for face_id in sequence:
            pixels_inside = []
            pixels_outside = []
            for i, edge_id in enumerate(inside_face_edges[face_id]):
                pixels_inside += zome.edges[edge_id]['pixels']
                pixels_outside += zome.edges[outside_face_edges[face_id][i]]['pixels']
            if random.random() > 0.8: # 20% chance no color
                rgbas = np.zeros((len(pixels_inside), 4))
            else:
                rgbas = color_map(np.linspace(0,1,len(pixels_inside)))
                rgbas = (rgbas * 255).astype(int)
            for j,p in enumerate(pixels_inside):
                rgba_values[p] =  rgbas[j]
                p2 = pixels_outside[j]
                rgba_values[p2] = rgbas[j]
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
            frame_id += 1
        color_id = color_id + 1 if color_id < num_colors-1 else 0
        color_map = plt.colormaps.get_cmap(color_map_names[color_id])
        if random.random() > 0.8: # 20% chance change direction
            is_reverse = not is_reverse

if __name__ == "__main__":
    zome = Zome(args.model_file)
    faces_pattern(zome=zome)


