let canvas;
let ctx;
let nameInput;
let colourInput;
let errorText;
let messages;
let messageBox;
let playerList;

let myName;
let myColour;

let bgImage = new Image();
bgImage.src = "/static/grass.jpg";

function lerp(a, b, t) {
	return a + t * (b - a);
}

// How often to send player position to the server
const UPDATE_FREQUENCY = 10;

let onlinePlayers = [];
let socket;
function initSocket() {
	socket = new WebSocket("gamews");
	socket.addEventListener("open", () => {
		console.log("new connection");
	});

	socket.addEventListener("close", () => {
		console.log("connection closed");
	});

	socket.addEventListener("error", e => {
		console.log(e);
	});

	socket.addEventListener("message", e => {
		let msg = JSON.parse(e.data);
		// console.log(msg);
		
		if (msg.type == "refuse-join") {
			errorText.innerHTML = msg.reason;
		}
		else if (msg.type == "accept-join") {
			// We have been accepted to join the server

			onlinePlayers = msg.players;

			updatePlayerList();

			setInterval(sendUpdates, 1000 / UPDATE_FREQUENCY);
		}
		else if (msg.type == "player-joined") {
			addChat("server", `${msg.name} has joined the game`);

			onlinePlayers.push({
				name: msg.name,
				colour: msg.colour,
				x: msg.x,
				y: msg.y,

				// For movement interpolation
				lastX: 0,
				lastY: 0,

				lastUpdate: Date.now()
			});

			updatePlayerList();
		}
		else if (msg.type == "player-left") {
			addChat("server", `${msg.name} has left the game`);

			let i = onlinePlayers.findIndex(p => p.name == msg.name);
			if (i != -1) {
				onlinePlayers.splice(i, 1);
			}

			updatePlayerList();
		}
		else if (msg.type == "recieve-chat") {
			addChat(msg.from, msg.text);
		}
		else if (msg.type == "player-update") {
			console.log(`Player update: ${msg.from} ${msg.x} ${msg.y}`);

			const p = onlinePlayers.find(p => p.name == msg.from);
			if (p !== undefined) {
				p.lastX = p.x;
				p.lastY = p.y;

				p.x = msg.x;
				p.y = msg.y;

				p.lastUpdate = Date.now();
			}
		}
	});
}

function sendUpdates() {
	sendMessage({
		type: "player-update",
		x: playerX,
		y: playerY
	});
}

function sendMessage(o) {
	socket.send(JSON.stringify(o));
}

function addChat(from, msg) {
	console.log(`${from}: ${msg}`);

	let messageNode = document.createTextNode(`${from}: ${msg}`);
	messages.appendChild(messageNode);
	messages.appendChild(document.createElement("br"));
}

function updatePlayerList() {
	playerList.innerHTML = "";

	for (let p of onlinePlayers) {
		let node = document.createElement("span");
		node.innerText = p.name + " "; // Using innerHTML here allows an XSS attack
		playerList.appendChild(node);
	}
}

let currentKeys = new Set();
function isKeyDown(k) {
	return currentKeys.has(k);
}

let screenLeft;
let screenRight;
let screenTop;
let screenBottom;
function setupCamera() {
	screenLeft = playerX - canvas.width / 2;
	screenRight = playerX + canvas.width / 2;
	screenTop = playerY - canvas.height / 2;
	screenBottom = playerY + canvas.height / 2;
	ctx.translate(-screenLeft, -screenTop);
}

// Clip the line (x1, y1) to (x2, y2) to the rect (l, r, t, b)
// assuming that (x1, y1) is inside the rect.
function getLineIntersection(x1, y1, x2, y2, l, r, t, b) {
	let tx;
	let ty;

	if (x2 > x1) {
		tx = (r - x1) / (x2 - x1);
	}
	else {
		tx = (l - x1) / (x2 - x1);
	}

	if (y2 > y1) {
		ty = (b - y1) / (y2 - y1);
	}
	else {
		ty = (t - y1) / (y2 - y1);
	}

	let tMin;
	if (x1 == x2) tMin = ty; // If both are equal, then errrrm...?
	if (y1 == y2) tMin = tx;
	else tMin = Math.min(tx, ty);
	return {x: x1 + tMin * (x2 - x1), y: y1 + tMin * (y2 - y1)};
}

let playerX = 100;
let playerY = 100;

function drawPlayer(x, y, name, colour) {
	const playerSize = 50;

	// Screen space position of the player
	const screenX = x - screenLeft;
	const screenY = y - screenTop;

	if (screenX + playerSize / 2 < 0 || 
		screenX - playerSize / 2 > canvas.width ||
		screenY + playerSize / 2 < 0 ||
		screenY - playerSize / 2 > canvas.height) {
		
		// Off screen - draw indicator on edge of screen showing player position

		// Intersection of line from client player to currently being drawn player and edges of screen
		const {x: ix, y: iy} = getLineIntersection(playerX, playerY, x, y, screenLeft, screenRight, screenTop, screenBottom);
		
		const indicatorRadius = 15;

		ctx.strokeStyle = "cyan";
		ctx.lineWidth = 3;

		ctx.beginPath();
		ctx.arc(ix, iy, indicatorRadius, 0, 2 * Math.PI);
		ctx.stroke();
	}
	else {
		// On screen

		ctx.fillStyle = colour;
		ctx.fillRect(x - playerSize / 2, y - playerSize / 2, playerSize, playerSize);
	
		ctx.fillStyle = "white";
		ctx.fillText(name, x, y - playerSize / 2 - 10);
	}
}

function drawBackground() {
	const ix = Math.floor(screenLeft / bgImage.width);
	const iy = Math.floor(screenTop / bgImage.height);

	ctx.drawImage(bgImage, ix * bgImage.width, iy * bgImage.height);
	ctx.drawImage(bgImage, (ix + 1) * bgImage.width, iy * bgImage.height);

	ctx.drawImage(bgImage, ix * bgImage.width, (iy + 1) * bgImage.height);
	ctx.drawImage(bgImage, (ix + 1) * bgImage.width, (iy + 1) * bgImage.height);
}

function draw() {
	ctx.save();

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	setupCamera();

	drawBackground();

	ctx.font = "30px serif";
	ctx.textAlign = "center";

	for (const p of onlinePlayers) {
		if (p.name == myName) {
			continue;
		}

		// drawPlayer(p.x, p.y, p.name, "green");
		// drawPlayer(p.lastX, p.lastY, p.name, "pink");
		
		// TODO: If posAge > ... {do something?}
		const posAge = (Date.now() - p.lastUpdate) / 1000;
		
		const t = posAge * UPDATE_FREQUENCY;
		// console.log(posAge);
		const x = lerp(p.lastX, p.x, t);
		const y = lerp(p.lastY, p.y, t);

		drawPlayer(x, y, p.name, p.colour);
	}

	drawPlayer(playerX, playerY, myName, myColour);

	ctx.restore();
}

function update(dt) {
	const playerSpeed = 250;

	if (isKeyDown("KeyW")) playerY -= playerSpeed * dt;
	if (isKeyDown("KeyS")) playerY += playerSpeed * dt;
	if (isKeyDown("KeyA")) playerX -= playerSpeed * dt;
	if (isKeyDown("KeyD")) playerX += playerSpeed * dt;
}

let lastTime = 0;
function gameLoop(timestamp) {
	const time = timestamp / 1000;
	const dt = time - lastTime;

	update(dt);
	draw();

	lastTime = time;

	requestAnimationFrame(gameLoop);
}

window.onload = () => {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	nameInput = document.getElementById("name");
	colourInput = document.getElementById("colour");
	errorText = document.getElementById("error");
	messages = document.getElementById("messages");
	messageBox = document.getElementById("message");
	playerList = document.getElementById("playerlist");

	canvas.addEventListener("keydown", e => {
		currentKeys.add(e.code);
	});

	canvas.addEventListener("keyup", e => {
		currentKeys.delete(e.code);
	});

	requestAnimationFrame(gameLoop);

	messageBox.addEventListener("keydown", e => {
		// Press enter to send a message
		if (e.key != "Enter") {
			return;
		}

		let msg = messageBox.value;

		if (msg == "") {
			// You cannot send an empty message
			return;
		}

		console.log(`Send message: ${msg}`);
		messageBox.value = "";

		sendMessage({
			type: "send-chat",
			text: msg
		});
	});

	initSocket();
}

function tryJoinGame() {
	myName = nameInput.value;
	myColour = colourInput.value;
	if (!myName) {
		errorText.innerHTML = "You must provide a name";
		return;
	}

	if (socket.readyState !== socket.OPEN) {
		errorText.innerHTML = "Not connected yet";
		return;
	}

	errorText.innerHTML = "";

	sendMessage({
		type: "request-join",
		name: myName,
		colour: myColour
	});
}
