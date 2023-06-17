import argparse
import numpy as np 
import sys
import os 
import colorsys
from python_utils import Zome, transform_to_byte_str


parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()


def top_down_pattern(zome):
    total_time_sec = 3 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    topZ = zome.height()
    max_x = zome.width_x()
    max_y =  zome.width_y()
    length_factor = 0.7 # TODO: can be a variable 
    alpha = 255 #TODO: can be a variable 
    frame_id = 0

    while True:
        timeBias = frame_id / zome.fps
        for _ in range(total_frames):
            rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
            thresholdZ = topZ * ( 1 - (frame_id % total_frames) / total_frames) 
            
            for i, p in enumerate(zome.pixels):
                if p[2] > thresholdZ:
                    brightness = 1 - (p[2] - thresholdZ) / (topZ * length_factor)
                    if brightness > 0:
                        hue =  (timeBias + p[0]/max_x +  p[1]/max_y  ) % 1 #hue depends on x
                        color = np.array(colorsys.hsv_to_rgb(hue, brightness, brightness))  * 255
                        color = color.astype(int)
                        rgba_values[i] = list(color) + [alpha] # combine the RGB, and alpha
                        # print(color,  brightness)
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg)
            frame_id += 1

    

if __name__ == "__main__":
    sys.stderr.write(f"loading file {args.model_file}\n")
    zome = Zome(args.model_file)
    # red_pattern(zome=zome)
    top_down_pattern(zome=zome)


