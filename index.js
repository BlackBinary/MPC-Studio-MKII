const midi = require("midi");
const sharp = require("sharp");

const width = 160;
const height = 80;

function convertData(originalBuffer) {
  const convertedBuffer = [];

  for (let i = 0; i < originalBuffer.length; i += 7) {
    const group = originalBuffer.slice(i, i + 7);
    let controlByte = 0;

    for (let j = 0; j < group.length; j++) {
      if (group[j] >= 128) {
        controlByte |= 1 << j;
        group[j] -= 128;
      }
    }

    convertedBuffer.push(controlByte, ...group);
  }

  return Buffer.from(convertedBuffer);
}

function generateMessageMetadata(x, y) {
  const imageCoordinates = [x, 0x00, y, 0x00];

  return [
    ...[0x06, 0x3d],
    ...[0x20, 0x20],
    ...imageCoordinates,
    ...[0x4e, 0x02],
  ];
}

function initSysex(output) {
  function sendPNG(imageData, x, y) {
    const messageHeader = [0xf0, 0x47, 0x7f, 0x4a, 0x04];
    const messageMetadata = generateMessageMetadata(x, y);

    const messageData = Buffer.concat([
      Buffer.from(messageHeader),
      Buffer.from(messageMetadata),
      imageData,
      Buffer.from([0xf7]),
    ]);

    output.sendMessage([...messageData]);
  }

  return {
    sendPNG,
  };
}

async function generateImage() {
  const splitCoordinates = [
    [0, 0, 60, 60],
    [60, 0, 60, 60],
    [120, 0, 40, 60],
    [0, 60, 60, 20],
    [60, 60, 60, 20],
    [120, 60, 40, 20],
  ];

  const image = sharp({
    create: {
      width: 160,
      height: 80,
      channels: 3,
      background: { r: 100, g: 100, b: 100 },
    },
  });
  image.composite([
    {
      input: Buffer.from(`
  <svg width="${width}" height="${height}" viewBox="0 0 ${height} ${height}">
    <text x="50%" y="50%" text-anchor="middle" dy="0.7em" fill="#000">${new Date().toISOString()}</text>
  </svg>
  `),
      top: 0,
      left: 0,
    },
  ]);

  const buffer = await image.toFormat("png").toBuffer();

  // Iterate over each split coordinate
  return Promise.all(
    splitCoordinates.map(async (splitCoordinate, i) => {
      const [left, top, width, height] = splitCoordinate;

      // Extract the split image
      const splitImage = sharp(buffer).extract({ left, top, width, height });

      // Save the split image to the output folder
      return convertData(
        await splitImage
          .toFormat("png", {
            compressionLevel: 9,
            colours: 8,
          })
          .toBuffer()
      );
    })
  );
}

function sendChunks(sysex, chunks) {
  sysex.sendPNG(chunks[0], 0, 0);
  sysex.sendPNG(chunks[1], 60, 0);
  sysex.sendPNG(chunks[2], 120, 0);
  sysex.sendPNG(chunks[3], 0, 60);
  sysex.sendPNG(chunks[4], 60, 60);
  sysex.sendPNG(chunks[5], 120, 60);
}

(async () => {
  const output = new midi.Output();
  output.openPort(0);
  const sysex = initSysex(output);

  setInterval(async () => {
    console.log("Generating image...");
    const imageChunks = await generateImage();
    console.log("Sending image...");
    sendChunks(sysex, imageChunks);
  }, 100);
  // output.closePort();
})();
