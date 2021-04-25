import os
import re
import shutil
import logging
import zipfile
import numpy as np
from pathlib import Path
from flask import Flask, flash, request, redirect, url_for, render_template
from PIL import Image
from src.mappingUtils import allowed_file, upload_exists, export_exists, img2arr, replaceRGBValue

# Set up custom logs
logger = logging.getLogger(__name__)
logging.basicConfig(format='Logs: %(asctime)s %(message)s', datefmt='%m/%d/%Y %I:%M:%S %p')

# Static folders
UPLOAD_FOLDER = 'static/uploads/'
EXPORT_FOLDER = 'static/exports/'
Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
Path(EXPORT_FOLDER).mkdir(parents=True, exist_ok=True)

# Server settings
ALLOWED_EXTENSIONS = set(['zip'])

# App configurations
app = Flask(__name__)
app.secret_key = 'b7af88817cf64764c250e7ef4e31117903a3da6d101851bc'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['EXPORT_FOLDER'] = EXPORT_FOLDER
app.config['DEBUG'] = False


@app.route('/navigator.html')
def navigator():
    return render_template('navigator.html')

@app.route('/navigator.html', methods=['POST'])
def navigator_upload():
    markerID = request.form['markerID']
    print(markerID)
    import random
    directions = ['0', '1', '2', '3']  # Left, Right, Top, Down
    return random.choice(directions)

@app.route('/mapper.html')
def mapper():
    # Send uploaded file to client if it exists, render website without file otherwise
    uFile = upload_exists(app.config['UPLOAD_FOLDER'])
    if uFile:
        # Send exported file to client if it exists, render website with uploaded file otherwise
        eFile = export_exists(app.config['EXPORT_FOLDER'])
        if hasattr(eFile, 'shape'):
            gridMap = img2arr(eFile, arr2str=True)
            return render_template('mapper.html', filename=uFile[0], x=uFile[1], y=uFile[2], scale=uFile[3], gridMap=gridMap)
        else:
            return render_template('mapper.html', filename=uFile[0], x=uFile[1], y=uFile[2], scale=uFile[3])
    return render_template('mapper.html')

@app.route('/mapper.html', methods=['POST'])
def mapper_upload():
    if 'gridMap' not in request.form:

        # Check if file and its attributes arrives
        if 'file' not in request.files or 'x' not in request.form or 'y' not in request.form or 'scale' not in request.form:
            flash('No file, x, y, or scale part')
            return redirect(request.url)
        mapFile = request.files['file']
        mapX = request.form['x']
        mapY = request.form['y']
        scale = request.form['scale']

        # Check if attributes are empty
        if mapFile.filename == '' or mapX == '' or mapY == '' or scale == '':
            flash('No file, x, y, or scale provided for uploading')     
            return redirect(request.url)

        # Check if correct file type was provided
        if mapFile and allowed_file(mapFile.filename, ALLOWED_EXTENSIONS) and mapX and mapY and scale:
            # Check validity of attribute formatting
            try:
                mapX = float(mapX.replace(',', '.'))
                mapY = float(mapY.replace(',', '.'))
            except ValueError:    
                flash('Type of x and y must be decimal or integer')
                return redirect(request.url)
            if scale == '1' or scale == '2' or scale == '4':
                scale = int(scale)
            else:
                flash('Scale value must equal 1, 2, or 4')
                return redirect(request.url)

            # Save received file with its attributes
            filename = 'map' + str(scale) + '_' + str(mapX) + '_' + str(mapY) + '.png'    
            filesave = os.path.join(app.config['UPLOAD_FOLDER'], 'map.zip')
            shutil.rmtree(app.config['UPLOAD_FOLDER'])
            Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)             
            mapFile.save(filesave)

            # Extract zip file
            with zipfile.ZipFile(filesave, 'r') as zip_ref:
                zFiles = zipfile.ZipFile.infolist(zip_ref)
                for zFile in zFiles:
                    if zFile.filename.endswith('.png'):
                        with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'wb') as f:
                            f.write(zip_ref.read(zFile.filename))
                        break
            os.remove(filesave)

            # Send file to client along with its attributes
            if os.path.isfile(os.path.join(app.config['UPLOAD_FOLDER'], filename)):
                flash('Floor plan successfully uploaded and displayed below')

                # Reset grid map
                shutil.rmtree(app.config['EXPORT_FOLDER'])
                Path(EXPORT_FOLDER).mkdir(parents=True, exist_ok=True) 
                return render_template('mapper.html', filename=filename, x=mapX, y=mapY, scale=scale)
            else:
                flash('Compressed image type must be png')
                shutil.rmtree(app.config['UPLOAD_FOLDER'])
                Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True) 
                return redirect(request.url)
        else:
            flash('Allowed file type is zip')
            return redirect(request.url)

    # If grid map arrives
    else:
        uFile = upload_exists(app.config['UPLOAD_FOLDER'])
        gridMap = request.form['gridMap']

        # Check if grid map is empty
        if gridMap == '' or gridMap == 'None':
            # Delete uploaded floor map and exported grid map if requested
            if 'gridMapDelete' in request.form:
                shutil.rmtree(app.config['UPLOAD_FOLDER'])
                Path(UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)   
                shutil.rmtree(app.config['EXPORT_FOLDER'])
                Path(EXPORT_FOLDER).mkdir(parents=True, exist_ok=True) 
                flash('Floor plan successfully deleted')  
                return render_template('mapper.html')
            else: 
                flash('No map provided for uploading')  
                return render_template('mapper.html', filename=uFile[0], x=uFile[1], y=uFile[2], scale=uFile[3])

        # Check if grid map was provided
        if gridMap:

            # Extract RGB values from grid map
            xLen, yLen = int(float(uFile[1])) * int(float(uFile[3])), int(float(uFile[2])) * int(float(uFile[3]))
            gridMapArr = gridMap.split('-')
            redArr, greenArr, blueArr = [], [], []
            for item in gridMapArr:
                rgbString = re.search(r'\((.*?)\)', item)
                if rgbString:
                    rgbString = [int(s) for s in rgbString.group(1).split(',')]
                    redArr.append(rgbString[0])
                    greenArr.append(rgbString[1])
                    blueArr.append(rgbString[2])
                else:
                    redArr.append(255)
                    greenArr.append(255)
                    blueArr.append(255)

            # Compute marker positions for every 1 meter
            gridMap2DCoord = np.reshape(np.array(blueArr), (-1, xLen)).tolist()
            markers, counter, scaleStep = [], 0, int(float(uFile[3]))
            for row_idx, row in enumerate(gridMap2DCoord):
                for col_idx, col in enumerate(row):
                    if col == 255 and row_idx % scaleStep == 0 and col_idx % scaleStep == 0:
                        markers.append(counter)
                    counter = counter + 1

            # Update marker values in RGB lists
            if len(markers) > 0:
                for marker in markers:
                    redArr[marker] = 150
                    greenArr[marker] = 150
                    blueArr[marker] = 150

            # Convert RGB lists to a 3 channel numpy array
            gridImgMap = np.zeros((yLen, xLen, 3), dtype='uint8')
            gridImgMap[:, :, 0] = np.reshape(np.array(redArr), (-1, xLen))
            gridImgMap[:, :, 1] = np.reshape(np.array(greenArr), (-1, xLen))
            gridImgMap[:, :, 2] = np.reshape(np.array(blueArr), (-1, xLen))

            # Remove all marker values in RGB lists
            gridImgMapNoMarkers = replaceRGBValue([redArr.copy(), greenArr.copy(), blueArr.copy()], 150, [255, 255, 255], 2, [xLen, yLen])

            # Replace all product shelf values in RGB lists
            gridImgMapNoShelves = replaceRGBValue([redArr.copy(), greenArr.copy(), blueArr.copy()], 200, [0, 0, 0], 2, [xLen, yLen])

            # Save received grid map as png image (in different formats)
            shutil.rmtree(app.config['EXPORT_FOLDER'])
            Path(EXPORT_FOLDER).mkdir(parents=True, exist_ok=True) 
            img = Image.fromarray(gridImgMap.astype('uint8'), 'RGB')
            img.save(os.path.join(app.config['EXPORT_FOLDER'], 'originalMap.png'), format='png')
            imgNoMarkers = Image.fromarray(gridImgMapNoMarkers.astype('uint8'), 'RGB')
            imgNoMarkers.save(os.path.join(app.config['EXPORT_FOLDER'], 'noMarkersMap.png'), format='png')
            imgNoShelves = Image.fromarray(gridImgMapNoShelves.astype('uint8'), 'RGB')
            imgNoShelves.save(os.path.join(app.config['EXPORT_FOLDER'], 'noShelvesMap.png'), format='png')

            # Send exported file to client if it exists
            eFile = export_exists(app.config['EXPORT_FOLDER'])
            if hasattr(eFile, 'shape'):
                gridMap = img2arr(eFile, arr2str=True)
            
            flash('Map successfully uploaded and displayed below')
            return render_template('mapper.html', filename=uFile[0], x=uFile[1], y=uFile[2], scale=uFile[3], gridMap=gridMap)

@app.route('/uploads/<filename>')
def display_uploads(filename):
    # Provide static upload files to display in URL format
    return redirect(url_for('static', filename='uploads/' + filename), code=301)

@app.route('/exports/<filename>')
def display_exports(filename):
    # Provide static export files to display in URL format
    return redirect(url_for('static', filename='exports/' + filename), code=301)

if __name__ == '__main__':
    app.run()