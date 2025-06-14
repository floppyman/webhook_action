const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");
const crypto = require("crypto");

function getBoolInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	return inp.toLowerCase() == "true";
}

function getStringInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	return inp;
}

function getIntInput(key, def) {
	var inp = core.getInput(key);
	if (inp == "") return def;
	try {
		return parseInt(inp);
	} catch {
		return def;
	}
}

function getInputs() {
	return {
		debug: getBoolInput("debug"),
		url: getStringInput("url", ""),
		method: getStringInput("method", "POST"),
		payload: getStringInput("payload", ""),
		signature_enabled: getBoolInput("signature_enabled", false),
		signature_header: getStringInput("signature_header", "X-Hub-Signature"),
		signature_method: getStringInput("signature_method", "HMAC-SHA256"),
		signature_secret: getStringInput("signature_secret", "CHANGE_ME"),
		signature: "",
	};
}

function generateSignature(secret, payload, alg) {
	// const key = new Buffer(secret, "hex");
	return crypto.createHmac(alg, secret).update(payload).digest("hex");
}

// async function generateHMAC_SHA1(key, message) {
// 	// Encode the key and message as UTF-8
// 	const encoder = new TextEncoder();
// 	const encodedKey = encoder.encode(key);
// 	const encodedMessage = encoder.encode(message);
// 	// Import the key for HMAC
// 	const cryptoKey = await crypto.subtle.importKey("raw", encodedKey, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
// 	// Generate the HMAC
// 	const signature = await crypto.subtle.sign("HMAC", cryptoKey, encodedMessage);
// 	// Convert the signature to a hex string
// 	return Array.from(new Uint8Array(signature))
// 		.map((b) => ("00" + b.toString(16)).slice(-2))
// 		.join("");
// }

// async function generateHMAC_SHA256(key, message) {
// 	// Encode the key and message as UTF-8
// 	const encoder = new TextEncoder();
// 	const encodedKey = encoder.encode(key);
// 	const encodedMessage = encoder.encode(message);
// 	// Import the key for HMAC
// 	const cryptoKey = await crypto.subtle.importKey("raw", encodedKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
// 	// Generate the HMAC
// 	const signature = await crypto.subtle.sign("HMAC", cryptoKey, encodedMessage);
// 	// Convert the signature to a hex string
// 	return Array.from(new Uint8Array(signature))
// 		.map((b) => ("00" + b.toString(16)).slice(-2))
// 		.join("");
// }

// async function generateHMAC_SHA512(key, message) {
// 	// Encode the key and message as UTF-8
// 	const encoder = new TextEncoder();
// 	const encodedKey = encoder.encode(key);
// 	const encodedMessage = encoder.encode(message);
// 	// Import the key for HMAC
// 	const cryptoKey = await crypto.subtle.importKey("raw", encodedKey, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
// 	// Generate the HMAC
// 	const signature = await crypto.subtle.sign("HMAC", cryptoKey, encodedMessage);
// 	// Convert the signature to a hex string
// 	return Array.from(new Uint8Array(signature))
// 		.map((b) => ("00" + b.toString(16)).slice(-2))
// 		.join("");
// }

async function run() {
	let inputs = {};

	try {
		core.info(`Reading inputs ...`);
		inputs = getInputs();

		if (inputs.debug) {
			core.info("");
			core.info("INPUT VALUES:");
			core.info(`  URL: ${inputs.url}`);
			core.info(`  Method: ${inputs.method}`);
			core.info(`  Payload: ${inputs.payload}`);
			core.info(`  Signature Enabled: ${inputs.signature_enabled}`);
			core.info(`  Signature Header: ${inputs.signature_header}`);
			core.info(`  Signature Method: ${inputs.signature_method}`);
			core.info(`  Signature Secret: ${inputs.signature_secret}`);
			core.info("");
		}

		if (inputs.signature_enabled === true) {
			let alg = "sha256";
			if (inputs.signature_method == "HMAC-SHA1") alg = "sha1";
			if (inputs.signature_method == "HMAC-SHA256") alg = "sha256";
			if (inputs.signature_method == "HMAC-SHA512") alg = "sha512";
			inputs.signature = generateSignature(inputs.signature_secret, inputs.payload, alg);
		}
	} catch (error) {
		core.error("Failed getting action inputs");
		if (error.response && error.response.data) core.error(JSON.stringify(request, null, 4));
		core.setFailed(error.message);
	}

	try {
		core.info(`Connecting to endpoint ${inputs.url} ...`);

		let headers = {};
		if (inputs.method === "POST") headers["Content-Type"] = "application/json";
		if (inputs.method === "GET") headers["Content-Type"] = "application/x-www-form-urlencoded";
		if (inputs.signature_enabled === true) {
			headers[inputs.signature_header] = inputs.signature;
		}

		if (inputs.method === "GET") inputs.url = inputs.url + "?" + inputs.payload;

		let request = {
			method: inputs.method,
			headers: headers,
		};
		if (inputs.method === "POST") {
			if (inputs.debug) {
				core.info("");
				core.info(`Payload 1: ${inputs.payload}`);
				core.info(`Payload 2: ${JSON.stringify(inputs.payload)}`);
				core.info(`Payload 3: ${JSON.parse(inputs.payload)}`);
				core.info(`Payload 4: ${JSON.parse(JSON.stringify(inputs.payload))}`);
				core.info("");
			}
			request.data = inputs.payload;
		}

		if (inputs.debug) {
			core.info("");
			core.info(`URL: ${inputs.url}`);
			core.info("REQUEST:");
			core.info(JSON.stringify(request, null, 4));
			core.info("");
		}

		const response = await axios({
			url: inputs.url,
			...request,
		});

		if (inputs.debug) {
			core.info("");
			core.info("RESPONSE:");
			core.info(`  status: ${response.status}`);
			core.info(`  statusText: ${response.statusText}`);
			core.info(`  statusCode: ${response.statusCode}`);
			core.info(`  body: ${response.body}`);
			core.info("");
		}

		if (response.status == 200) core.info(`Webhook service successfully called ${inputs.url}`);

		core.setOutput("response", {
			statusCode: response.status,
			body: response.data,
		});
	} catch (error) {
		core.error("Failed making request to Webhook service");
		if (error.response && error.response.data) core.error(JSON.stringify(request, null, 4));
		core.setFailed(error.message);
	}
}

run();
