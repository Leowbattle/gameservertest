import { route, type Route } from "@std/http/unstable-route";
import { serveDir, serveFile } from "@std/http/file-server";

enum PlayerState {
	joining,
	joined,
}

interface PlayerInfo {
	socket: WebSocket,
	state: PlayerState,
	name: string,
}

let players: Array<PlayerInfo> = [];

function playerExistsWithName(name: string): boolean {
	return players.findIndex(p => p.name == name) != -1;
}

const routes: Route[] = [
	{
		pattern: new URLPattern({pathname: "/"}),
		handler: (req: Request) => serveFile(req, "index.html")
	},
	{
		pattern: new URLPattern({pathname: "/join"}),
		handler: joinHandler
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

function serveJson(_req: Request, obj: any) {
	const body = JSON.stringify(obj);
	return new Response(body, {
		status: 200,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}

function joinHandler(req: Request): Response {
	const url = new URL(req.url);
	const name = url.searchParams.get("name");
	
	if (name == null) {
		// Must input name
		return serveJson(req, {
			accepted: false, 
			reason: "Must provide name"
		});
	}

	if (playerExistsWithName(name)) {
		// Must be unique
		return serveJson(req, {
			accepted: false,
			reason: "Name already taken"
		});
	}

	return serveJson(req, {accepted: true});
}

function gamewsHandler(req: Request): Response {
	if (req.headers.get("upgrade") != "websocket") {
		return new Response(null, { status: 400 });
	}

	const { socket, response } = Deno.upgradeWebSocket(req);

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

	return response;
}