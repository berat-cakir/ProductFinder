// Event for picking an object (color)
document.querySelector('#objects').addEventListener('click', function(event) {
    // Reset all object borders
    var allObjects = document.getElementsByClassName('colorPalette');
    for (var i=0, max=allObjects.length; i < max; i++) {
        allObjects[i].style.border = 'none';
    }
    var object = event.target;
    if (object === this) {
        console.log('No object found');
        allObjects[0].style.border = '3px solid rgb(255, 0, 0)';  // Target default object
    } else {
        object.style.border = '3px solid rgb(255, 0, 0)';  // Target selected object
    } 
});

// Event for coloring table data cells
document.querySelector('#occupancyGrid').addEventListener('click', function(event) {
    // Select table data cell
    var td = event.target;
    while (td !== this && !td.matches('td')) {
        td = td.parentNode;
    }
    if (td === this) {
        console.log('No table cell found');
    } else {
        // Get selected object
        var selectedObject;
        var allObjects = document.getElementsByClassName('colorPalette');
        for (var i=0, max=allObjects.length; i < max; i++) {
            if (allObjects[i].style.getPropertyValue('border') == '3px solid rgb(255, 0, 0)') {
                selectedObject = allObjects[i];
            }
        }
        // Color table data cell to selected object color
        if (td.style.getPropertyValue('background-color') == 'transparent') {
            td.style.backgroundColor = selectedObject.style.backgroundColor;
        } else {
            td.style.backgroundColor = 'transparent'; 
            td.children[0].innerHTML = '\u0020';
        }
    }
});

// Export grid map as string
function gridMapExport() {
    var tbl = document.getElementById('occupancyGrid');
    var output = '';
    for (var i = 0, row; row = tbl.rows[i]; i++) {
        for (var j = 0, col; col = row.cells[j]; j++) {
            output = output + col.style.getPropertyValue('background-color') + '-';
        }  
    }
    var formInfo = document.forms['gridMapUpload'];
    output = output.substring(0, output.length - 1);
    formInfo.gridMap.value = output;
}