import { route, type Route } from "@std/http/unstable-route";
import { serveDir, serveFile } from "@std/http/file-server";

interface PlayerInfo {
	socket: WebSocket,
	name: string,
	x: number,
	y: number,
}

const players: Array<PlayerInfo> = [];

function playerExistsWithName(name: string): boolean {
	return players.findIndex(p => p.name == name) != -1;
}

const routes: Route[] = [
	{
		pattern: new URLPattern({pathname: "/"}),
		handler: (req: Request) => serveFile(req, "index.html")
	},
	{
		pattern: new URLPattern({pathname: "/gamews"}),
		handler: gamewsHandler
	},
	{
		pattern: new URLPattern({ pathname: "/static/*" }),
		handler: (req: Request) => serveDir(req)
	}
];

function defaultHandler(_req: Request) {
	return new Response("Not found", { status: 404 });
}

Deno.serve(route(routes, defaultHandler));

function gamewsHandler(req: Request): Response {
	if (req.headers.get("upgrade") != "websocket") {
		return new Response(null, { status: 400 });
	}

	const { socket, response } = Deno.upgradeWebSocket(req);

	socket.addEventListener("open", () => {
		console.log("new connection");
	});

	socket.addEventListener("close", () => {
		// Remove this player
		const i = players.findIndex(p => p.socket == socket);

		// Notify other players that someone has left
		for (const p of players) {
			if (p.socket == socket) {
				continue;
			}

			p.socket.send(JSON.stringify({
				type: "player-left",
				name: players[i].name
			}));
		}

		if (i != -1) {
			players.splice(i, 1);
		}
	});

	socket.addEventListener("error", e => {
		console.log(e);
	});

	socket.addEventListener("message", e => {
		const msg = JSON.parse(e.data);
		if (msg.type == "request-join") {
			if (players.findIndex(p => p.socket == socket) != -1) {
				socket.send(JSON.stringify({
					type: "refuse-join",
					reason: "Player already connected"
				}));
				return;
			}

			if (!msg.name) {
				socket.send(JSON.stringify({
					type: "refuse-join",
					reason: "Invalid name"
				}));
			}
			else if (playerExistsWithName(msg.name)) {
				socket.send(JSON.stringify({
					type: "refuse-join",
					reason: "Player already exists with that name"
				}));
			}
			else {
				socket.send(JSON.stringify({
					type: "accept-join",
					players
				}));

				players.push({
					socket,
					name: msg.name,
					x: 0,
					y: 0
				});

				// Notify others that someone has joined
				for (const p of players) {
					// if (p.socket == socket) {
					// 	continue;
					// }
		
					p.socket.send(JSON.stringify({
						type: "player-joined",
						name: msg.name,
						x: 0, // Code duplication blah blah blah
						y: 0,
					}));
				}
			}
		}
		else if (msg.type == "send-chat") {
			const i = players.findIndex(p => p.socket == socket);
			if (i == -1) {
				// Unjoined players cannot chat
				return;
			}

			for (const p of players) {
				p.socket.send(JSON.stringify({
					type: "recieve-chat",
					from: players[i].name,
					text: msg.text
				}));
			}
		}
		else if (msg.type == "player-update") {
			const i = players.findIndex(p => p.socket == socket);
			if (i == -1) {
				// Unjoined players cannot update position
				// TODO: Reduce code duplication with unjoined player commands
				return;
			}

			players[i].x = msg.x;
			players[i].y = msg.y;

			for (const p of players) {
				if (p.name == players[i].name) {
					continue;
				}
				p.socket.send(JSON.stringify({
					type: "player-update",
					from: players[i].name,
					x: players[i].x,
					y: players[i].y
				}));
			}
		}
	});

	return response;
}