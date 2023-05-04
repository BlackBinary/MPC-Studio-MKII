const midi = require('midi');
const fs = require('fs');
const path = require('path');

const portNumber = 0;

const messages = {
  1: {
    fileName: '1.sysex',
    metaData: [0x06, 0x3D, 0x20, 0x20, 0x00, 0x00, 0x00, 0x00, 0x4E, 0x02],
  },
  2: {
    fileName: '2.sysex',
    metaData: [0x03, 0x37, 0x00, 0x20, 0x00, 0x00, 0x3C, 0x00, 0x79, 0x01],
  },
  3: {
    fileName: '3.sysex',
    metaData: [0x12, 0x67, 0x00, 0x20, 0x3C, 0x00, 0x00, 0x00, 0x33, 0x08],
  },
  4: {
    fileName: '4.sysex',
    metaData: [0x05, 0x15, 0x00, 0x20, 0x3C, 0x00, 0x3C, 0x00, 0x3B, 0x02],
  },
  5: {
    fileName: '5.sysex',
    metaData: [0x02, 0x78, 0x00, 0x20, 0x78, 0x00, 0x00, 0x00, 0x42, 0x01],
  },
  6: {
    fileName: '6.sysex',
    metaData: [0x01, 0x73, 0x20, 0x20, 0x78, 0x00, 0x3C, 0x00, 0x4D, 0x00],
  },
};

function sendSysExMessage(portNumber, id, filename, messageMetadata) {
  // Connect to MIDI device
  const output = new midi.Output();
  output.openPort(portNumber);

  // Define SysEx message
  const header = [0xF0, 0x47, 0x7F, 0x4A, 0x04];
  const data = fs.readFileSync(path.join(__dirname, 'sysex', filename));
  const messageData = Buffer.concat([
    Buffer.from(header),
    Buffer.from([id]),
    Buffer.from(messageMetadata),
    data
  ]);
  const sysexMessage = [0xF0, ...messageData, 0xF7];

  // Send SysEx message
  output.sendMessage(sysexMessage);

  // Close MIDI device connection
  output.closePort();
}

Object.keys(messages).forEach((id) => {
  const message = messages[id];
  sendSysExMessage(portNumber, id, message.fileName, message.metaData);
});

