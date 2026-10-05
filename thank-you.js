// thank-you.js - show tracking ID, copy, WhatsApp link. Minimal chrome (no full nav needed).
import { boot, $, copy } from './common.js';
import { waLink } from './config.js';

boot({ chrome: false }); // is page pe simple rakha, full nav nahi chahiye

const params = new URLSearchParams(location.search);
const id = params.get('id') || '-';

$('#tid').textContent = id;
$('#waLink').href = waLink(`Hi! I placed an order. Tracking ID: ${id}`);

$('#copyTid').addEventListener('click', () => copy(id, 'Tracking ID copied!'));
