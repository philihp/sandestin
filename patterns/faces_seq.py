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


def shift(xs, n):
    if n == 0 : return xs
    e = np.empty_like(xs)
    if n > 0:
        e[:n] = xs[-n:]
        e[n:] = xs[:-n]
    elif n != 0:
        e[n:] = xs[:-n]
        e[:n] = xs[-n:]
    return e

def faces_pattern(zome):
    frame_id = 0
    # inside_strands_edges, outside_strands_edges = zome.get_inside_outside_strands_edges()
    inside_face_edges, outside_face_edges = zome.get_inside_outside_faces_edges()
    update_color_interval = 500
    num_colors = 50
    color_id = 0
    color_map_names = random.choices(plt.colormaps(), k=num_colors)
    color_map = plt.colormaps.get_cmap(color_map_names[0])
    rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 

    num_faces = len(inside_face_edges)
    color_length = 180

    while True:
        rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
        random_sequence_faces = random.sample(list(np.arange(num_faces)), random.randint(20,30))
        pixels_inside_per_face = []
        pixels_outside_per_face = []
        rgbas_per_face = []


        for face_id in random_sequence_faces:
            f_in = inside_face_edges[face_id]
            f_out = outside_face_edges[face_id]
            pixels_inside = zome.edges[f_in[1]]['pixels'][::-1] + zome.edges[f_in[0]]['pixels'] + zome.edges[f_in[2]]['pixels'] + zome.edges[f_in[3]]['pixels'][::-1]
            pixels_outside = zome.edges[f_out[1]]['pixels'][::-1] + zome.edges[f_out[0]]['pixels']  + zome.edges[f_out[2]]['pixels'] + zome.edges[f_out[3]]['pixels'][::-1]
            n= random.randint(1,color_length)
            pixels_inside = shift(pixels_inside, n)
            pixels_outside = shift(pixels_outside, n)
            if random.random() > 0.5:
                pixels_inside = pixels_inside[::-1]
                pixels_outside = pixels_outside[::-1]

            # brightness = 0.5 + 0.5 * np.sin(face_id + frame_id % num_faces )
            all_pixels_in_faces = np.linspace(0,1,len(pixels_inside))
            rotated_pixels = shift(all_pixels_in_faces, random.randint(1,color_length))
            # print(rotated_pixels)
            rgbas = color_map(rotated_pixels)
            rgbas = (rgbas * 255).astype(int)
            rgbas[:,3] = 0.5
            pixels_inside_per_face.append(pixels_inside)
            pixels_outside_per_face.append(pixels_outside)
            rgbas_per_face.append(rgbas)
        
        for i in range(color_length):
            for face_id in range(len(random_sequence_faces)):
                colors = rgbas_per_face[face_id]
                p1 = pixels_inside_per_face[face_id][i%len(pixels_inside_per_face[face_id])]
                rgba_values[p1] =  colors[i%len(pixels_inside_per_face[face_id])]
                p2 = pixels_outside_per_face[face_id][i%len(pixels_outside_per_face[face_id])]
                rgba_values[p2] =  colors[i%len(pixels_outside_per_face[face_id])]
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg) # this writes to the stdout which will be read by the app.js to send the frame. 
            frame_id += 1
        color_id = color_id + 1 if color_id < num_colors-1 else 0
        color_map = plt.colormaps.get_cmap(color_map_names[color_id])  
    
if __name__ == "__main__":
    zome = Zome(args.model_file)
    faces_pattern(zome=zome)


