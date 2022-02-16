const uiElement = document.getElementById("ui");
const ui = uiElement.getContext('2d');
const grid = document.getElementById('grid');
const g = grid.getContext('2d');
const mainPiece = document.getElementById('mainPiece');
const m = mainPiece.getContext('2d');
const blocks = document.getElementById('blocks');
const b = blocks.getContext('2d');
const debuggerCanvas = document.getElementById("overlay");
const dC = debuggerCanvas.getContext('2d');

document.addEventListener("keydown", keyPush);

debuggerCanvas.width = innerWidth;
debuggerCanvas.height = innerHeight;
grid.width = innerWidth;
grid.height = innerHeight;
uiElement.width = innerWidth;
uiElement.height = innerHeight;
mainPiece.width = innerWidth;
mainPiece.height = innerHeight;
blocks.width = innerWidth;
blocks.height = innerHeight;

    // VARIABLES

var gridX = 10;
var gridY = 20;
var tileSize;
var offsetX = 0;
var offsetY = 0;
var gridSizeX = 0;
var gridSizeY = 0;
var holdOffsetX = 0;
var holdOffsetY = 0;
var holdSizeX = 0;
var holdSizeY = 0;
var queueOffsetX = 0;
var queueOffsetY = 0;
var queueSizeX = 0;
var queueSizeY = 0;
var queueGap = 0;
var defaultX = Math.floor(gridX / 2); var defaultY = gridY - 1;

// game variables

var loop = true;
var canHold = true;
var dropping = false;
var pause = false;
var delay = 1000; var interval = 50;
var defaultProtection = 2; var protection = defaultProtection;
var queue = [];

// future variables

var gridBlocks;
var block;

//

var background = ui.createLinearGradient(0, 0, innerWidth, innerHeight);
background.addColorStop(0, '#0093E9');
background.addColorStop(1, '#80D0C7');

const blockOffsets = {
  I: [-1, 1, 2],
  J: [gridX - 1, -1, 1],
  L: [-1, 1, gridX + 1],
  O: [1, gridX, gridX + 1],
  S: [-1, gridX, gridX + 1],
  T: [-1, 1, gridX],
  Z: [gridX - 1, gridX, 1]
};

const XYOffsets = {
    I: [[-1, 0], [1, 0], [2, 0]],
    J: [[-1, 1], [-1, 0], [1, 0]],
    L: [[-1, 0], [1, 0], [1, 1]],
    O: [[1, 0], [0, 1], [1, 1]],
    S: [[-1, 0], [0, 1], [1, 1]],
    T: [[-1, 0], [1, 0], [0, 1]],
    Z: [[-1, 1], [0, 1], [1, 0]]
};

const correspondence = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

const colors = {
  0: 'blue',
  1: 'DarkBlue',
  2: 'orange',
  3: 'yellow',
  4: 'green',
  5: 'purple',
  6: 'red'
};

    // FUNCTIONS

/*
function calculateBlockSize(blockType)
{
    let size = [1, 1];

    let bottomLeft = [0, 0];

    let takenX = [];
    let takenY = [];

    for (let i = 0; i < blockOffsets[blockType].length; i++)
    {
        let localX = XYOffsets[blockType][i][0];
        let localY = XYOffsets[blockType][i][1];
        if (localX <= bottomLeft[0] && localY <= bottomLeft[1]) {bottomLeft = [localX, localY];}
        if (localX != 0 && takenX[localX + gridX] != 1) {size[0]++; takenX[localX + gridX] = 1;}
        if (localY != 0 && takenY[localY + gridY] != 1) {size[1]++; takenY[localY + gridY] = 1;}
    }

    return [size, bottomLeft];
}
*/
function calculateBlockSize(blockType)
{
    let size = [1, 1];

    let hashX = [];
    let hashY = [];

    let boundingBoxOffset = [0, 0, 0, 0];

    for (let i = 0; i < blockOffsets[blockType].length; i++)
    {
        let localIndexX = 1;
        let localIndexY = 2;
        let x = XYOffsets[blockType][i][0];
        let y = XYOffsets[blockType][i][1];
        let offsetX = Math.sign(x);
        let offsetY = Math.sign(y);
        if (offsetX < 0) {localIndexX = 0;}
        if (offsetY < 0) {localIndexY = 3;}
        if (x != 0 && hashX[x + gridX] != 1) {size[0]++; hashX[x + gridX] = 1; boundingBoxOffset[localIndexX] += offsetX}
        if (y != 0 && hashY[y + gridY] != 1) {size[1]++; hashY[y + gridY] = 1; boundingBoxOffset[localIndexY] -= offsetY}
    }
    return boundingBoxOffset;
}

function binSearch(array, target)
{
    let arraySize = array.length;
    let index = -1;
    let rangeX = 0;
    let rangeY = arraySize;
    let timeToSolve = Math.log2(arraySize);
    for (let i = 0; i < (timeToSolve + 1); i++)
    {
        let average = Math.floor(( rangeX + rangeY ) / 2);

        // check if average is number and if not where to go next
        if (target > array[average])
        {
            rangeX = average;
        }
        else if (target < array[average])
        {
            rangeY = average;
        }
        else if (target == array[average])
        {
            index = average;
            break;
        }
    }
    return index;
}

function convertCoordToPoint(x, y)
{
	let i = (gridX * y) + x;
	return i;
}

function convertPointToCoord(i, negative = 0)
{
    if (negative == 0)
    {
        if (i < 0)
        {
            negative = -1;
        }
        else
        {
            negative = 1;
        }
    }
	let x = ((i * negative) % gridX);
	let y = (((i * negative) - x) / gridX);
	if (x > gridX - 1) { x -= gridX - 1; }
	if (x < 0) { x += gridX - 1; }
	if (y < 0) { y += gridY - 1; }
	return [x * negative, y * negative];
}

function convertLocalCToGlobalC(x, y, primX, primY)
{
	newX = x + primX;
	newY = y + primY;
	if (newX > gridX - 1)
		newX -= gridX - 1;
	else if (newY > gridY - 1)
		newY -= gridY - 1; /*
	else if (newX < 0)
		newX += GRIDX - 1;
	else if (newY < 0)
		newY += GRIDY - 1; */
	return [newX, newY];
}

function convertLocalPToGlobalP(i, p)
{ // i = local block, p = global block
	return i + p;
}

function convertGlobalPToLocalP(i, p)
{ // i = local block, p = global block
	return i - p;
}

function convertGlobalCToLocalC(x, y, primX, primY)
{
	return [x - primX, y - primY];
}

function drawBlockAtPoint(pointX, pointY, blockType, context = b)
{
    let coreOffset = [];
    let boundingBox = calculateBlockSize(blockType);
    coreOffset[0] = pointX - (boundingBox[0] * Math.floor(tileSize * 0.5)) - (boundingBox[1] * Math.floor(tileSize * 0.5));
    coreOffset[1] = pointY - (boundingBox[3] * Math.floor(tileSize * 0.5)) - (boundingBox[2] * Math.floor(tileSize * 0.5));
    context.fillRect(coreOffset[0], coreOffset[1], tileSize, tileSize);
    context.beginPath();
    context.rect(coreOffset[0], coreOffset[1], tileSize, tileSize);
    context.stroke();

    // rest of blocks

    for (let i = 0; i < blockOffsets[blockType].length; i++)
    {
        let localBlock = XYOffsets[blockType][i];
        let localBlockX = coreOffset[0] + (localBlock[0] * tileSize);
        let localBlockY = coreOffset[1] - (localBlock[1] * tileSize);
        context.fillRect(localBlockX, localBlockY, tileSize, tileSize);
        context.beginPath();
        context.rect(localBlockX, localBlockY, tileSize, tileSize);
        context.stroke();
    }
}

function generateQueue(i = 3)
{
    b.clearRect(queueOffsetX, queueOffsetY, queueSizeX, queueSizeY);
    for (let v = 0; v < i; v++)
    {
        let randomNumber = Math.floor(Math.random() * correspondence.length)
        queue.push(randomNumber)
    }

    for (let j = 0; j < queue.length; j++)
    {
        let localBlockType = correspondence[queue[j]];
        b.fillStyle = colors[queue[j]];

        let middleX = Math.floor((queueOffsetX + queueOffsetX + queueSizeX) / 2) - Math.floor(tileSize * 0.5);
        // let middleY = queueOffsetY + (tileSize * 2 * j) + (tileSize * queueGap * (j + 1));
        let middleY = queueOffsetY + Math.floor(((queueSizeY / queue.length) * (j + 1))) - Math.floor(tileSize * 0.5) - Math.floor((queueSizeY / queue.length) / 2);
        drawBlockAtPoint(middleX, middleY, localBlockType, b);
        // b.fillRect(middleX, middleY, tileSize, tileSize);
    }
}

    // CLASSES

class Block
{
    constructor(x = defaultX, y = defaultY, ghostY = 0, type, color, blocks)
    {
        this.x = x;
        this.y = y;
        this.ghostY = ghostY;
        this.type = type;
        this.blocks = [];
        this.color = color;
        this.rotation = 0;
        if (type != null & color != null)
        {
            this.buildBlock(type, color);
        }
        else
        {
            this.buildBlock();
        }

        // hold stuff

        this.hold = []; // [blockType, blockColor]
    }

    buildBlock(bT = null, bC = null, q = true)
    {
        let blockChar = correspondence[queue[0]];
        let color = queue[0];
        if (bT != null)
        {
            blockChar = bT;
            color = bC;
        }
        protection = defaultProtection;
        this.type = blockChar;
        this.x = defaultX;
        this.y = defaultY;
        const test = Object.assign(this.blocks, blockOffsets[this.type]);
        this.color = color;
    	this.calculateGhost();
    	this.draw();
    	if (q == true)
    	{
        	queue.splice(0, 1);
        	generateQueue(1);
    	}
    }

    holdBlock()
    {
        if (canHold == false) {return;}
        canHold = false;
        let tempHold = [this.type, this.color];

        // DRAW NEW HOLD
        let boundingBox = calculateBlockSize(this.type);
        let blockSize = [-boundingBox[0] + boundingBox[1], -boundingBox[2] + boundingBox[3]];

        b.clearRect(holdOffsetX, holdOffsetY, holdSizeX, holdSizeY);
        b.fillStyle = colors[this.color];
        // find bottom core block position

        let centerPosition = [];
        centerPosition[0] = Math.floor((holdOffsetX + holdOffsetX + holdSizeX) / 2) - Math.floor(tileSize / 2);
        centerPosition[1] = Math.floor((holdOffsetY + holdOffsetY + holdSizeY) / 2) - Math.floor(tileSize / 2);
        drawBlockAtPoint(centerPosition[0], centerPosition[1], this.type, b);
        // rest of function

        if (this.hold.length > 0)
        {
            this.buildBlock(this.hold[0], this.hold[1], false);
            this.hold = tempHold;
        }
        else
        {
            this.buildBlock();
            this.hold = tempHold;
        }
    }

    calculateGhost()
    {
        // NEW IDEA: put all offsets in array and choose whichever one is highest
        let coreBlock = convertCoordToPoint(this.x, this.y);

        let ghostPositions = [];
        let lowestBlock = 0;

        // first core
        for (let i = coreBlock; i >= 0; i -= gridX)
        {
            let result = binSearch(gridBlocks.blocks, i);
            if (result != -1)
            {
                // block found
                let localY = Math.floor(i / gridX);
                ghostPositions.push(localY + 1);
                break;
            }
        }
        // now rest of blocks
        for (let bI = 0; bI < this.blocks.length; bI++)
        {
            if (this.blocks[bI] < lowestBlock)
            {
                lowestBlock = this.blocks[bI];
            }
            for (let i = this.blocks[bI] + coreBlock; i >= 0; i -= gridX)
            {
                let result = binSearch(gridBlocks.blocks, i);
                if (result != -1)
                {
                    // block found, calculate offset
                    let localY = Math.floor(i / gridX);
                    let offset = ((Math.floor(coreBlock / gridX) - Math.floor((coreBlock + this.blocks[bI]) / gridX)));
                    ghostPositions.push(localY + 1 + offset);
                }
            }
        }

        let greatest = 0;
        for (let i = 0; i < ghostPositions.length; i++)
        {
            if (ghostPositions[i] > greatest)
            {
                greatest = ghostPositions[i];
            }
        }
        if (greatest == 0 && lowestBlock != 0)
        {
            let lowestY = Math.floor((coreBlock + lowestBlock) / gridX);
            greatest = this.y - lowestY;
        }
        this.ghostY = greatest;

    }

    rotate(cc)
    {
        let coreBlock = convertCoordToPoint(this.x, this.y);
        let rotMatrix = [[], []];
        let theoreticalRotation = this.rotation;
    	if (cc == true)
    	{
    	    theoreticalRotation = theoreticalRotation - 1;
    	    if (theoreticalRotation < 0) {theoreticalRotation += 4;}
    		rotMatrix[0][0] = 0; rotMatrix[0][1] = -1;//rotMatrix[0] = { 0, -1 };
    		rotMatrix[1][0] = 1; rotMatrix[1][1] = 0; //rotMatrix[1] = { 1, 0 };
    	}
    	else
    	{
    	    theoreticalRotation = (theoreticalRotation + 1) % 4;
    		rotMatrix[0][0] = 0; rotMatrix[0][1] = 1;//rotMatrix[0] = {0, 1};
    		rotMatrix[1][0] = -1; rotMatrix[1][1] = 0; //rotMatrix[1] = { -1, 0 };
    	}

        let newPoints = [];

    	for (let i = 0; i < this.blocks.length; i++)
    	{
    	    let gPoint = convertLocalPToGlobalP(this.blocks[i], coreBlock);
    	    let gVector = convertPointToCoord(gPoint);
    	    let lVector = convertGlobalCToLocalC(gVector[0], gVector[1], this.x, this.y);


			let locRotX = (rotMatrix[0][0] * lVector[0]) + (rotMatrix[1][0] * lVector[1]);
			let locRotY = (rotMatrix[0][1] * lVector[0]) + (rotMatrix[1][1] * lVector[1]);

			let newCoords = [this.x + locRotX, this.y + locRotY];
			let newPoint = convertCoordToPoint(newCoords[0], newCoords[1]);
            let localPoint = convertCoordToPoint(locRotX, locRotY);

            let found = binSearch(gridBlocks.blocks, newPoint);
            if (found != -1 || newCoords[0] < 0 || newCoords[0] >= gridX || newCoords[1] < 0 || newCoords[1] > gridY)
            {
                return;
            }
            newPoints.push(localPoint);
    	}


	    this.rotation = theoreticalRotation;
	    this.blocks = newPoints;
    	this.calculateGhost(gridBlocks);
    }

    solidify(force = false)
    {
        if (protection > 0 && force == false) {protection--; return;}
        let coreBlock = convertCoordToPoint(this.x, this.y);
        gridBlocks.append(coreBlock, this.color);
        for (let i = 0; i < this.blocks.length; i++)
        {
            gridBlocks.append(this.blocks[i] + coreBlock, this.color);
        }
        canHold = true;
        this.x = null;
        this.y = null;
        this.blocks = [];
        this.type = null;
        gridBlocks.clearLine();
        gridBlocks.draw();
        this.buildBlock();
    }

    softDrop()
    {

        this.y = block.ghostY;
        this.draw();
    }

    move(direction)
    {
        /*
        0 = down
        1 = left
        2 = right
        */
        let h = 0;
        let k = 0;
        switch (direction)
    	{
        	case 0:
        		h = 0; k = -1;
        		break;
        	case 1:
        		h = -1; k = 0;
        		break;
        	case 2:
        		h = 1; k = 0;
        		break;
        	default:
        		h = 0; k = 0;
    	}
    	let theoreticalX = this.x + h; let theoreticalY = this.y + k;
    	let theoreticalPoint = convertCoordToPoint(theoreticalX, theoreticalY);
    	let coreBlock = convertCoordToPoint(this.x, this.y);
    	// first check for grid collision with core block
    	if (theoreticalX < 0 || theoreticalX > gridX - 1 || theoreticalY < 0 || theoreticalY > gridY)
    	{
    	    if (direction == 0) {this.solidify();}
            return;
    	}
    	// now check for block collision with core block
        for (let i = 0; i < gridBlocks.blocks.length; i++)
        {
            if (gridBlocks.blocks[i] == theoreticalPoint)
            {
        	    if (direction == 0) {this.solidify();}
                return;
            }
        }
        // now do the same for other blocks
        for (let v = 0; v < this.blocks.length; v++)
        {
            let globalBlockPoint = convertLocalPToGlobalP(this.blocks[v], coreBlock);
            let globalCoords = convertPointToCoord(globalBlockPoint, 1);
            let theoreticalBX = globalCoords[0] + h; let theoreticalBY = globalCoords[1] + k;
            let theoreticalBlockPoint = convertCoordToPoint(theoreticalBX, theoreticalBY);
            if (theoreticalBX < 0 || theoreticalBX > gridX - 1 || theoreticalBY < 0 || theoreticalBY > gridY)
        	{
        	    if (direction == 0) {this.solidify();}
                return;
        	}
        	// now check for block collision with core block
            for (let i = 0; i < gridBlocks.blocks.length; i++)
            {
                if (gridBlocks.blocks[i] == theoreticalBlockPoint)
                {
                    if (direction == 0) {this.solidify();}
                    return;
                }
            }
        }
        protection = defaultProtection;
        this.x = theoreticalX; this.y = theoreticalY;
        this.draw();
    	this.calculateGhost();
    }



    draw()
    {
        m.clearRect(0, 0, grid.width, grid.height);
        m.fillStyle = colors[this.color];
        // first draw origin block
        m.globalAlpha = 1;
        m.fillRect((this.x) * tileSize + offsetX, (grid.height - offsetY) - ((this.y + 1) * tileSize), tileSize, tileSize);
        // now draw rest
        m.fillStyle = colors[this.color];
        let corePos = convertCoordToPoint(this.x, this.y);
        for (let i = 0; i < this.blocks.length; i++)
        {
            let globalPos = convertLocalPToGlobalP(this.blocks[i], corePos);
            let globalCoords = convertPointToCoord(globalPos, 1);
            if (globalCoords[1] > gridY - 1) { continue; }
            m.fillRect((globalCoords[0]) * tileSize + offsetX, (grid.height - offsetY) - ((globalCoords[1] + 1) * tileSize), tileSize, tileSize);
        }

        // now draw ghost block
        let ghostCoreCoords = [this.x, this.ghostY];
        let ghostCorePos = convertCoordToPoint(this.x, this.ghostY);
        m.globalAlpha = 0.5;
        m.fillRect((this.x) * tileSize + offsetX, (grid.height - offsetY) - ((ghostCoreCoords[1] + 1) * tileSize), tileSize, tileSize);
        // rest of ghost blocks
        for (let i = 0; i < this.blocks.length; i++)
        {
            let globalPos = convertLocalPToGlobalP(this.blocks[i], ghostCorePos);
            let globalCoords = convertPointToCoord(globalPos, 1);
            m.fillRect((globalCoords[0]) * tileSize + offsetX, (grid.height - offsetY) - ((globalCoords[1] + 1) * tileSize), tileSize, tileSize);
        }
    }
}

class restedBlocks
{
    constructor(blocks = [], blockColors = [])
    {
        this.blocks = blocks;
        this.blockColors = blockColors;
    }

    draw()
    {
        b.clearRect(offsetX, offsetY, gridSizeX, gridSizeY);
        for (let i = 0; i < this.blocks.length; i++)
        {
            let coords = convertPointToCoord(this.blocks[i]);
            b.fillStyle = colors[this.blockColors[i]];
            b.globalAlpha = 1;
            b.fillRect(coords[0] * tileSize + offsetX, (grid.height - offsetY) - ((coords[1] + 1) * tileSize), tileSize, tileSize);
        }
    }

    clearLine()
    {
        let cont = false;
        for (let i = this.blocks.length - 1; i >= 0; i--)
        {
            if (this.blocks[i] % 10 == 0)
            {
                // is row block
                for (let j = 1; j < gridX; j++)
                {
                    if (this.blocks[i + j] != this.blocks[i] + j)
                    {
                        cont = true; break;
                    }
                }
                if (cont == true)
                {
                    cont = false;
                    continue;
                }
                else
                {
                    // line cleared
                    if (delay >= 450) { delay -= interval; }
                    this.blocks.splice(i, gridX);
                    this.blockColors.splice(i, gridX);
                    for (let m = i; m < this.blocks.length; m++)
                    {
                        this.blocks[m] -= gridX;
                    }
                }
            }
        }
    }

    append(pos, color)
    {
        // this.blocks.push(pos);
        // this.blockColors.push(color);

        // /*
        let greatestBelow = -Infinity;
        let insertIndex = 0;

        for (let i = 0; i < this.blocks.length; i++)
        {
            if (this.blocks[i] <= pos && this.blocks[i] >= greatestBelow)
            {
                greatestBelow = this.blocks[i];
                insertIndex = i + 1;
            }
        }
        //
        this.blocks.splice(insertIndex, 0, pos);
        this.blockColors.splice(insertIndex, 0, color);
        //*/
    }
}

    // FIND TILE SIZE // // // //

if (grid.width > grid.height)
{
    tileSize = Math.floor(grid.height / gridY);
}
else
{
    tileSize = Math.floor(grid.width / gridX);
}

    // FIND OFFSETS // // // //

offsetX = Math.floor((grid.width / 2) - ((gridX * tileSize) / 2));
offsetY = Math.floor((grid.height / 2) - ((gridY * tileSize) / 2));
gridSizeX = tileSize * gridX;
gridSizeY = tileSize * gridY;
holdOffsetX = offsetX - (5 * tileSize);
holdOffsetY = offsetY;
holdSizeX = Math.floor(tileSize * 4.5);
holdSizeY = Math.floor(tileSize * 4.5);
queueOffsetX = offsetX + Math.floor(tileSize * 0.5) + (tileSize * gridX);
queueOffsetY = offsetY;
queueGap = 0.5;
queueSizeX = Math.floor(tileSize * 5.5)
queueSizeY = Math.floor(tileSize * 5.5) + Math.floor(queueGap * 5.5 * tileSize);

    // MAKE UI // // // //

ui.fillStyle = background;
ui.fillRect(0, 0, grid.width, grid.height);
ui.fillStyle = "#ffffff";
ui.fillRect(offsetX, offsetY, gridX * tileSize, gridY * tileSize);

for (let x = 0; x < gridX; x++)
{
    for (let y = 0; y < gridY; y++)
    {
        g.beginPath();
        g.globalAlpha = 1;
        g.rect(x * tileSize + offsetX, y * tileSize + offsetY, tileSize, tileSize);
        g.stroke();
    }
}

// now hold

ui.fillStyle = "#ffffff";
ui.fillRect(holdOffsetX, holdOffsetY, holdSizeX, holdSizeY);
ui.beginPath();
ui.rect(holdOffsetX, holdOffsetY, holdSizeX, holdSizeY);
ui.stroke();

// now queue

ui.fillRect(queueOffsetX, queueOffsetY, queueSizeX, queueSizeY);
ui.beginPath()
ui.rect(queueOffsetX, queueOffsetY, queueSizeX, queueSizeY);
ui.stroke();

    // MAIN SCRIPT // // // //

generateQueue();
gridBlocks = new restedBlocks();
block = new Block();

function setup()
{
    block.hold = [];
    gridBlocks.draw();
    block.draw();
    delay = 1000;
    setTimeout(gameLoop, delay);
}

function gameLoop()
{
    // LOOP
    if (loop == true)
    {
        setTimeout(gameLoop, delay);
    }
    else
    {
        return;
    }
    // SCRIPT


    block.move(0);

    // DRAW
}
setup();

// INPUT

let solidID;

function keyPush(evnt)
{
    if (pause == false && loop == true)
    {
        switch(evnt.keyCode)
        {
            case 37:
                // left
                block.move(1);
                block.draw();
                break;
            case 38:
                // up
                block.rotate(true);
                block.draw();
                break;
            case 17:
                // right ctrl
                block.rotate(false);
                block.draw();
            case 39:
                block.move(2);
                block.draw();
                // right
                break;
            case 40:
                // block.move(0);
                block.softDrop();
                gridBlocks.draw();
                // block.draw();
                // down
                break;
            case 69:
                block.solidify(true);
                break;
            case 32:
                block.y = block.ghostY;
                block.solidify(true);
                break;
            case 67:
                block.holdBlock();
                break;
            case 27:
                pause = true;
                loop = false;
                dC.globalAlpha = 0.5;
                dC.fillStyle = "gray";
                // dC.fillRect(0, 0, innerWidth, innerHeight);
                break;
            case 82:
                location.reload();
                break;
        }
    }
    else
    {
        switch(evnt.keyCode)
        {
            case 27:
                pause = false;
                loop = true;
                dC.clearRect(0, 0, grid.width, grid.height);
                gameLoop();
                break;
            case 82:
                location.reload();
                break;
        }
    }
}
