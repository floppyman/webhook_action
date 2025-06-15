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
	return crypto.createHmac(alg, secret).update(payload).digest("hex");
}

async function run() {
	let inputs = {};
	let request = {};

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
		if (error.response && error.response.data) {
			core.error("ERROR.RESPONSE.DATA");
			core.error(error.response.data);
			core.error("REQUEST");
			core.error(JSON.stringify(request, null, 4));
		}
		core.setFailed(error.message);
	}

	try {
		core.info(`Connecting to endpoint ${inputs.url} ...`);

		let headers = {};
		if (inputs.method === "POST") headers["Content-Type"] = "application/json";
		if (inputs.method === "GET") headers["Content-Type"] = "application/x-www-form-urlencoded";
		if (inputs.signature_enabled === true) headers[inputs.signature_header] = inputs.signature;

		if (inputs.method === "GET") inputs.url = `${inputs.url}?${inputs.payload}`;

		request.url = inputs.url;
		request.method = inputs.method;
		request.headers = headers;
		if (inputs.method === "POST") request.data = inputs.payload;

		if (inputs.debug) {
			core.info("");
			core.info("REQUEST:");
			core.info(JSON.stringify(request, null, 4));
			core.info("");
		}

		const response = await axios(request);

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
		if (error.response && error.response.data) {
			core.error("ERROR.RESPONSE.DATA");
			core.error(error.response.data);
			core.error("REQUEST");
			core.error(JSON.stringify(request, null, 4));
		}
		core.setFailed(error.message);
	}
}

run();
