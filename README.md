# webhook action

Send Github/Gitea Action calls to any Webhook.

Supports sending an HMAC-SHA1, HMAC-SHA256, HMAC-SHA512 signature of the payload in a custom header (default header: X-Hub-Signature).

Action is build around supporting: https://github.com/adnanh/webhook?tab=readme-ov-file

## Inputs

```yaml
url:
  description: Url to send the request
  required: true
  default: ""

method:
  description: HTTP Method to use when calling the Webhook, supports GET or POST
  required: true
  default: POST

payload:
  description: The data to send to the webhook, can be 'application/json' for use with POST and 'x-www-form-urlencoded' for use with GET
  required: true
  default: ""

signature_enabled:
  description: Enabled generation of the signature header
  required: false
  default: false

signature_header:
  description: Name of the header the signature will be send as
  required: false
  default: X-Hub-Signature

signature_method:
  description: Method to generate the signature, supports HMAC-SHA1, HMAC-SHA256 or HMAC-SHA512
  required: false
  default: HMAC-SHA256

signature_secret:
  description: Secret (password) to use to generate the signature, must match the value in the Webhook system
  required: false
  default: CHANGE_ME

debug:
  description: Prints debug information for dev/troubleshooting
  required: false
  default: false
```

## Example Usage

`if` param can be one of success(), failure() or cancelled(), to control when the hook is called

### POST with JSON data

```yaml
- name: redeploy on server
  uses: floppyman/webhook_action@main
  if: success()
  with:
    url: 'https://hook.example.com' or ${{ secrets.WEBHOOK_URL }}
    method: POST
	payload: "{\"test\": \"value\", \"other\": 123}"
```

### GET with x-www-form-urlencoded data

```yaml
- name: redeploy on server
  uses: floppyman/webhook_action@main
  if: success()
  with:
    url: 'https://hook.example.com' or ${{ secrets.WEBHOOK_URL }}
    method: GET
	payload: "test=value&other=123"
```

### POST with JSON data and signature

```yaml
- name: redeploy on server
  uses: floppyman/webhook_action@main
  if: success()
  with:
    url: 'https://hook.example.com' or ${{ secrets.WEBHOOK_URL }}
    method: POST
	payload: "{\"test\": \"value\", \"other\": 123}"
	signature_enabled: true
	signature_header: X-Hub-Signature
	signature_method: HMAC-SHA256
	signature_secret: SOME-secure_password-1234
```