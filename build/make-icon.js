'use strict';

const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const pngToIco = require('png-to-ico');

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8A7A6A"/>
      <stop offset="1" stop-color="#5E5043"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect x="166" y="96" width="22" height="52" rx="11" fill="#41392F"/>
  <rect x="324" y="96" width="22" height="52" rx="11" fill="#41392F"/>
  <rect x="104" y="122" width="304" height="290" rx="42" fill="#FBFAF8"/>
  <path d="M104 164 a42 42 0 0 1 42 -42 h220 a42 42 0 0 1 42 42 v22 h-304 z" fill="#6E5F52"/>
  <g fill="#6E5F52">
    <circle cx="170" cy="250" r="18"/><circle cx="256" cy="250" r="18"/><circle cx="342" cy="250" r="18"/>
    <circle cx="170" cy="330" r="18"/>
  </g>
  <g fill="#BDAE9E">
    <circle cx="256" cy="330" r="18"/><circle cx="342" cy="330" r="18"/>
  </g>
</svg>`;

const outDir = __dirname;
const sizes = [256, 128, 64, 48, 32, 24, 16];

function renderPng(size) {
  return new Resvg(SVG, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

fs.writeFileSync(path.join(outDir, 'icon.png'), renderPng(512));

pngToIco(sizes.map(renderPng))
  .then((ico) => {
    fs.writeFileSync(path.join(outDir, 'icon.ico'), ico);
    console.log('icon.png and icon.ico written to build/');
  })
  .catch((err) => { console.error(err); process.exit(1); });
