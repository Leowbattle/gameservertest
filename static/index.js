let canvas;
let nameInput;
let errorText;
let messages;
let messageBox;

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
		console.log(msg);
		
		if (msg.type == "refuse-join") {
			errorText.innerHTML = msg.reason;
		}
		else if (msg.type == "player-joined") {
			addChat("server", `${msg.name} has joined the game`);
		}
		else if (msg.type == "player-left") {
			addChat("server", `${msg.name} has left the game`);
		}
		else if (msg.type == "recieve-chat") {
			addChat(msg.from, msg.text);
		}
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

window.onload = () => {
	canvas = document.getElementById("canvas");
	nameInput = document.getElementById("name");
	errorText = document.getElementById("error");
	messages = document.getElementById("messages");
	messageBox = document.getElementById("message");

	canvas.addEventListener("keydown", e => {
		console.log(e);
	});

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
};

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
