// Convert data url to blob
function dataURItoBlob(dataURI) {
    // Convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0) {
        byteString = atob(dataURI.split(',')[1]);
    } else {
        byteString = unescape(dataURI.split(',')[1]);
    }

    // Separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // Write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {type:mimeString});
};

// Download file from client browser
function SaveAsFile(t, f, m) {
    try {
        var b = new Blob([t], {type:m});
        saveAs(b, f);
    } catch (e) {
        window.open('data:' + m + ',' + encodeURIComponent(t), '_blank', '');
    }
};

// Export markers as zip file
function markerExport() {
    markerQuantity = parseInt(document.getElementById('markerQuantity').value);
    if (markerQuantity == -1) {
        window.alert('No markers found. Please generate map with markers first.');
    } else {
        document.getElementsByClassName('downloadButton')[0].disabled = true;
        var width = 600;
        var height = width;
        var nTiles = 8;
        var padding = 3;
        var cornerLength = 4;
        var dx = width / nTiles;
        var dy = height / nTiles;
        var allMarkers = new Array();
        var zip = new JSZip();
        var canvas = document.createElement('canvas');

        for (i = 0; i <= markerQuantity; i++) {
            // Create canvas
            canvas.width = 2 * padding * dx + width;
            canvas.height = 2 * padding * dy + height;
            var ctx = canvas.getContext('2d');

            // Clear background
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw corners
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, dx, dy * cornerLength);
            ctx.fillRect(0, 0, cornerLength * dx, dy);
            ctx.fillRect(canvas.width - dx, canvas.height - dy * cornerLength, dx, dy * cornerLength);
            ctx.fillRect(canvas.width - cornerLength * dx, canvas.height - dy, cornerLength * dx, dy);
            ctx.fillRect(canvas.width - dx, 0, dx, dy * cornerLength);
            ctx.fillRect(canvas.width - cornerLength * dx, 0, dx * cornerLength, dy);
            ctx.fillRect(0, canvas.height - dy * cornerLength, dx, dy * cornerLength);
            ctx.fillRect(0, canvas.height - dy, cornerLength * dx, dy);

            // Draw marker and id
            ctx.drawImage(makeMarker(i, width, height), padding * dx, padding * dy);
            ctx.font = 'bold 50px sans-serif';
            ctx.fillStyle = '#000000';
            ctx.fillText('id: '+ i, 100, 150);

            allMarkers.push(dataURItoBlob(canvas.toDataURL('image/png')));
        }
        for (i = 0; i < allMarkers.length; i++) {
            zip.folder('markers').file(i + '.png', allMarkers[i]);
        }
        zip.generateAsync({type: 'blob'}).then(function(content) {
            SaveAsFile(content, 'markers.zip');
            document.getElementsByClassName('downloadButton')[0].disabled = false;
        });
    }
};