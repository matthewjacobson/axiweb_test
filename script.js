'use strict';

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

const butConnect = document.getElementById('butConnect');
const butSubmit = document.getElementById('butSubmit');
const textInput = document.getElementById('textInput');
const textOutput = document.getElementById('textOutput');

document.addEventListener('DOMContentLoaded', () => {
  if ('serial' in navigator) {
    butConnect.addEventListener('click', clickConnect);
    butSubmit.addEventListener('click', clickSubmit);
  } else {
    console.log('Browser not supported - please try again in chrome');
    butConnect.innerText = 'Browser not supported';
    butConnect.disabled = true;
//     butSubmit.disabled = true;
  }
});

// opens a Web Serial connection and sets up the input and output stream
async function connect() {
  
  // request a port and open a connection
  port = await navigator.serial.requestPort();
  
  // filter for axidraw
//   port = await navigator.serial.requestPort({ filters: [{ usbVendorId: 0x04d8, usbProductId: 0xfd92 }] });
  
  // wait for the port to open
  await port.open({ baudRate: 38400 });

  // setup the write stream
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;

  // setup the read stream
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;

  reader = inputStream.getReader();
  readLoop();

}

// closes the Web Serial connection
async function disconnect() {

  // close the input stream
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }

  // close the output stream
  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  // close the port
  await port.close();
  port = null;

}

// click handler for the connect/disconnect button
async function clickConnect() {
  console.log('connect button clicked');
  // disconnect
  if (port) {
    console.log('port is already active - attempting to disconnect');
    await disconnect();
    butConnect.disabled = true;
//     butSubmit.disabled = true;
    return;
  }
  // connect
  console.log('attempting to connect');
  await connect();
  butConnect.innerText = 'Disconnect';
//   butSubmit.disabled = false;
}

// click handler for the submit button
function clickSubmit() {
  if (port) {
    writeToStream(textInput.value.split("\n"));
    textInput.value = '';
  }
}

// reads data from the input stream and displays it on screen
async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      console.log('[READ]', value);
      textOutput.value += value + '\n';
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

// gets a writer from the output stream and send the lines to device
function writeToStream(...lines) {
  const writer = outputStream.getWriter();
  lines.forEach((line) => {
    console.log('[SEND]', line);
    writer.write(line + '\n');
  });
  writer.releaseLock();
}
