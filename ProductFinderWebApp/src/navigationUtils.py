import math
import png
import numpy as np
#import matplotlib.pyplot as plt
from PIL import Image


def dist2d(point1, point2):
    """
    Euclidean distance between two points
    :param point1:
    :param point2:
    :return:
    """
    x1, y1 = point1[0:2]
    x2, y2 = point2[0:2]

    dist2 = (x1 - x2)**2 + (y1 - y2)**2

    return math.sqrt(dist2)


def normalizeData(data):
    """
    Normalize data in the range of 0 to 1
    :return:
    """
    return (data - np.min(data)) / (np.max(data) - np.min(data))
    

def png_to_ogm(filename, normalized=False, origin='lower'):
    """
    Convert a png image to occupancy data.
    :param filename: the image filename
    :param normalized: whether the data should be normalised, i.e. to be in value range [0, 1]
    :param origin:
    :return:
    """
    img = Image.open(filename).convert('L')
    img_data = np.array(img)

    if normalized:
        img_data = np.round(normalizeData(img_data), 2)

    if origin == 'lower':
        img_data = img_data[::-1]

    return img_data


def plot_path(path):
    start_x, start_y = path[0]
    goal_x, goal_y = path[-1]

    # plot path
    path_arr = np.array(path)
    plt.plot(path_arr[:, 0], path_arr[:, 1], 'y')

    # plot start point
    plt.plot(start_x, start_y, 'ro')

    # plot goal point
    plt.plot(goal_x, goal_y, 'go')

    plt.show()
