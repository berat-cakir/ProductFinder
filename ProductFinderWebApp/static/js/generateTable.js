// Generate table
function tableCreate(tbl, mapXRounded, mapYRounded, mapScaleRounded, adjHeight) {
    var gridMap = document.getElementById('gridMapDownload');
    var gripMapExists = false;
    var counter = 0;
    var markerID = 0;
    if (typeof(gridMap) != 'undefined' && gridMap != null) {
        gridMap = gridMap.getAttribute('value');
        gridMap = gridMap.split('-');
        gripMapExists = true;
    }
    tbl.style.height = adjHeight + 'px';
    divHeight = (Math.trunc(adjHeight / (mapYRounded * mapScaleRounded)) - 3) + 'px';
    var tbdy = document.createElement('tbody');
    for (var i = 0; i < mapYRounded * mapScaleRounded; i++) {  // Rows
        var tr = document.createElement('tr');
        for (var j = 0; j < mapXRounded * mapScaleRounded; j++) {  // Columns
            var div = document.createElement('div');
            div.style.height = divHeight;
            div.style.lineHeight = divHeight;
            var td = document.createElement('td');
            td.style.fontSize = Math.trunc((parseFloat(divHeight) * 0.8)) + 'px';
            if (gripMapExists) {
                td.style.backgroundColor = gridMap[counter];
                counter = counter + 1;
            } else {
                td.style.backgroundColor = 'transparent';
            }
            if (td.style.getPropertyValue('background-color') == 'rgb(150, 150, 150)') {
                div.appendChild(document.createTextNode(markerID));
                td.appendChild(div);
                markerID = markerID + 1;
            } else {
                div.appendChild(document.createTextNode('\u0020'));
                td.appendChild(div);
            }
            tr.appendChild(td);
        }
        tbdy.appendChild(tr);
    }
    tbl.appendChild(tbdy);
}

// Display floor dimensions
var mapX = document.getElementById('x'); 
mapXRounded = Math.round(parseFloat(mapX.getAttribute('value')));
mapX.innerHTML = 'Length of x-axis in meters (rounded): ' + mapXRounded;
var mapY = document.getElementById('y'); 
mapYRounded = Math.round(parseFloat(mapY.getAttribute('value')));
mapY.innerHTML = 'Length of y-axis in meters (rounded): ' + mapYRounded;
var mapScale = document.getElementById('scale'); 
mapScaleRounded = Math.round(parseFloat(mapScale.getAttribute('value')));
mapScale.innerHTML = 'Floor plan scale: 1:' + mapScaleRounded;

// Get image dimensions
var tbl = document.getElementById('occupancyGrid');
tbl.setAttribute('background', tbl.getAttribute('background') + '?' + (new Date()).getTime());
var img = new Image();
img.src = tbl.getAttribute('background');
img.onload = function() {
    var width = img.width, height = img.height;
    var adjHeight = (640 * height / width);
    adjHeight = Math.round(adjHeight);
    tableCreate(tbl, mapXRounded, mapYRounded, mapScaleRounded, adjHeight);
}