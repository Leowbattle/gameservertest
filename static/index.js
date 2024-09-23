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

function lerp(a, b, t) {
	return a + t * (b - a);
}

// How often to send player position to the server
const UPDATE_FREQUENCY = 5;

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

let playerX = 100;
let playerY = 100;

function drawPlayer(x, y, name, colour) {
	const playerSize = 50;

	ctx.fillStyle = colour;
	ctx.fillRect(x - playerSize / 2, y - playerSize / 2, playerSize, playerSize);

	ctx.fillStyle = "black";
	ctx.fillText(name, x, y - playerSize / 2 - 10);
}

let lastTime = 0;
function gameLoop(timestamp) {
	let time = timestamp / 1000;
	let dt = time - lastTime;

	// Update

	const playerSpeed = 250;

	if (isKeyDown("KeyW")) playerY -= playerSpeed * dt;
	if (isKeyDown("KeyS")) playerY += playerSpeed * dt;
	if (isKeyDown("KeyA")) playerX -= playerSpeed * dt;
	if (isKeyDown("KeyD")) playerX += playerSpeed * dt;

	// Draw

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.font = "16px serif";
	ctx.textAlign = "center";

	drawPlayer(playerX, playerY, myName, myColour);

	for (const p of onlinePlayers) {
		if (p.name == myName) {
			continue;
		}

		// drawPlayer(p.x, p.y, p.name, "green");
		// drawPlayer(p.lastX, p.lastY, p.name, "pink");
		
		// TODO: If posAge > ... {do something?}
		const posAge = (Date.now() - p.lastUpdate) / 1000;
		
		const t = posAge * UPDATE_FREQUENCY;
		console.log(posAge);
		const x = lerp(p.lastX, p.x, t);
		const y = lerp(p.lastY, p.y, t);

		drawPlayer(x, y, p.name, p.colour);
	}

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
