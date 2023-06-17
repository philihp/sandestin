import json
import argparse
import numpy as np 
import sys
import struct 


parser = argparse.ArgumentParser()

parser.add_argument("model_file", type=str, help="the zome's model file", default='zome_model.json')

args = parser.parse_args()

class Zome:
    def __init__(self, model_file):
        with open(model_file) as f:
            model_json = json.load(f)
        self.edges = model_json['model']['edges']
        self.nodes = model_json['model']['nodes']
        self.pixels = model_json['model']['pixels']
        self.num_pixels = len(self.pixels)
        self.fps = model_json['framesPerSecond']
        
    def top(self):
        all_z = [self.nodes[i]['point'][2] for i in range(len(self.nodes))]
        top = [0.0, 0.0, np.max(all_z)]
        return top 


def transform_to_byte_str(frame_id: int, rgba_values: list) -> str:
    """Transform the rgba values for all leds in a frame to bytes str for printing. 

    Args:
        frame_id (int): current frame id 
        rgba_values (list[int]): the entire list of led rgba values, it will be list of list of 4 ints. Like [[255,0,0,255], [23,32,41,0]]

    Returns:
        str: a byte string to output to the led controller 
    """
    message =  struct.pack('<I', frame_id) #start with frame_id, turn it into a little endian 4 byte unsigned int
    message += struct.pack('BBBB' * len(rgba_values), *(value for rgba in rgba_values for value in rgba))
    return message 

def red_pattern(zome):
    num_pixels = zome.num_pixels
    # for frame_id in range():
    frame_id = 0
    while True:
        rgba_values = [[255, 0, 0, 255]] * num_pixels
        msg = transform_to_byte_str(frame_id, rgba_values)
        sys.stdout.buffer.write(msg)
        frame_id+=1

def top_down_pattern(zome):
    total_time_sec = 5 # TODO: can be a variable
    total_frames = total_time_sec * zome.fps
    topZ = zome.top()[2]

    length_factor = 0.3 # TODO: can be a variable 
    alpha = 255 #TODO: can be a variable 
    frame_id = 0
    while True:
        for _ in range(total_frames):
            rgba_values = np.zeros((zome.num_pixels, 4)).astype(int) #initialize with all zeros 
            thresholdZ = topZ * ( 1 - (frame_id % total_frames) / total_frames) 
            template_color = np.array([255, 255 , 255]) # TODO: can be a variable 
            for i, p in enumerate(zome.pixels):
                if p[2] > thresholdZ:
                    brightness = 1 - (p[2] - thresholdZ) / (topZ * length_factor)
                    if brightness > 0:
                        color = template_color * brightness
                        color = color.astype(int)
                        rgba_values[i] = list(color) + [alpha] # combine the RGB, and alpha
                        # print(color,  brightness)

                        # sys.stderr.write(rgba_values[i])
            msg = transform_to_byte_str(frame_id, rgba_values)
            sys.stdout.buffer.write(msg)
            frame_id += 1


    

if __name__ == "__main__":
    sys.stderr.write(f"loading file {args.model_file}\n")
    zome = Zome(args.model_file)
    # red_pattern(zome=zome)
    top_down_pattern(zome=zome)


