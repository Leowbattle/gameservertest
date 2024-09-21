let canvas;
let nameInput;
let errorText;

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
		console.log(e);
	});
}

function sendMessage(o) {
	socket.send(JSON.stringify(o));
}

window.onload = () => {
	canvas = document.getElementById("canvas");
	nameInput = document.getElementById("name");
	errorText = document.getElementById("error");

	canvas.addEventListener("keydown", e => {
		console.log(e);
	});

	initSocket();
};

async function tryJoinGame() {
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
		type: "join",
		name: name
	});
	
	// let res = await fetch(`join?name=${name}`).then(res => res.json());
	
	// let errorText = document.getElementById("error");
	// if (!res.accepted) {
	// 	errorText.innerHTML = res.reason;
	// 	return;
	// }
	// errorText.innerHTML = "";
}
