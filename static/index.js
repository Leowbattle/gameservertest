let canvas;
let ctx;
let nameInput;
let errorText;
let messages;
let messageBox;
let playerList;

// How often to send player position to the server
const UPDATE_FREQUENCY = 10;

let onlinePlayers = [];
let socket;
function initSocket() {
	socket = new WebSocket("gamews");
	socket.addEventListener("open", () => {
		console.log("new connection");

		setInterval(sendUpdates, 1000 / UPDATE_FREQUENCY);
	});

	socket.addEventListener("close", () => {
		console.log("connection closed");
	});

	socket.addEventListener("error", e => {
		console.log(e);
	});

	socket.addEventListener("message", e => {
		let msg = JSON.parse(e.data);
		console.log(msg);
		
		if (msg.type == "refuse-join") {
			errorText.innerHTML = msg.reason;
		}
		else if (msg.type == "accept-join") {
			// We have been accepted to join the server

			onlinePlayers = msg.players;

			updatePlayerList();
		}
		else if (msg.type == "player-joined") {
			addChat("server", `${msg.name} has joined the game`);

			onlinePlayers.push({
				name: msg.name,
				x: msg.x,
				y: msg.y
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
		node.innerText = p.name; // Using innerHTML here allows an XSS attack
		playerList.appendChild(node);
	}
}

let currentKeys = new Set();
function isKeyDown(k) {
	return currentKeys.has(k);
}

let playerX = 100;
let playerY = 100;

let lastTime = 0;
function gameLoop(timestamp) {
	let time = timestamp / 1000;
	let dt = time - lastTime;

	// Update

	const playerSpeed = 250;
	const playerSize = 50;

	if (isKeyDown("KeyW")) playerY -= playerSpeed * dt;
	if (isKeyDown("KeyS")) playerY += playerSpeed * dt;
	if (isKeyDown("KeyA")) playerX -= playerSpeed * dt;
	if (isKeyDown("KeyD")) playerX += playerSpeed * dt;

	// Draw

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = "red";
	ctx.fillRect(playerX - playerSize / 2, playerY - playerSize / 2, playerSize, playerSize);

	lastTime = time;

	requestAnimationFrame(gameLoop);
}

window.onload = () => {
	canvas = document.getElementById("canvas");
	ctx = canvas.getContext("2d");
	nameInput = document.getElementById("name");
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
	let name = nameInput.value;
	if (!name) {
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
		name: name
	});
}
