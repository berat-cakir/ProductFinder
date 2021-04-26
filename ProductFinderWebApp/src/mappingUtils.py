import os
import re
import numpy as np
from PIL import Image

def allowed_file(filename, allowed_extensions):
    # Returns True if filename complies with allowed extensions
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def upload_exists(upload_folder):
    # Return uploaded file already exists
    for filename in os.listdir(upload_folder):
        if filename.endswith('.png'):
            mapX = re.match(r'^[^_]+_([^_]+)_[^_]+$', filename)
            mapY = filename.rsplit('_', 1)[-1].rsplit('.', 1)[0]
            scale = filename[3]
            if mapX and mapY and scale:
                mapX = mapX.group(1)
                return [filename, mapX, mapY, scale]
    return None

def export_exists(export_folder, imageFile='originalMap.png', includeImage=True):
    # Return exported file already exists
    for filename in os.listdir(export_folder):
        if filename == imageFile:
            if includeImage:
                img = Image.open(os.path.join(export_folder, filename)).convert('RGB')
                return np.array(img)
            else:
                return True
    return False

def img2arr(img, arr2str=False):
    # Converts image to list
    redArr = img[:, :, 0].ravel()
    greenArr = img[:, :, 1].ravel()
    blueArr = img[:, :, 2].ravel()
    imgArr = np.stack((redArr, greenArr, blueArr), axis=1).tolist()

    # Convert list to string
    if arr2str:
        imgStr = []
        for item in imgArr:
            rgbStr = ', '.join([str(s) for s in item])
            if rgbStr == '255, 255, 255':
                imgStr.append('transparent')
            else:
                imgStr.append('rgb(' + rgbStr + ')')
        return '-'.join(imgStr)
    return imgArr

def replaceRGBValue(RGB, findColor, replaceByRGB, searchIn, dim):
    # Replace all selected color values in RGB lists
    counter = 0
    for item in RGB[searchIn]:
        if item == findColor:
            RGB[0][counter] = replaceByRGB[0]
            RGB[1][counter] = replaceByRGB[1]
            RGB[2][counter] = replaceByRGB[2]
        counter = counter + 1
    
    # Convert RGB lists to a 3 channel numpy array
    gridImgMap = np.zeros((dim[1], dim[0], 3), dtype='uint8')
    gridImgMap[:, :, 0] = np.reshape(np.array(RGB[0]), (-1, dim[0]))
    gridImgMap[:, :, 1] = np.reshape(np.array(RGB[1]), (-1, dim[0]))
    gridImgMap[:, :, 2] = np.reshape(np.array(RGB[2]), (-1, dim[0]))
    return gridImgMap