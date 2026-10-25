import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as THREE from 'three';
import { GARMENT_COLORS } from '../garment-palette.js';
import { cottonMaterial, setCottonColor } from '../garment-material.js';

const context = {};
vm.runInNewContext(await readFile('catalog-filters.js', 'utf8'), context);
const catalog = context.PosterCatalog;
const items = [
  { id: 'a', group: 'Italiani', subgroup: 'Autore', film: 'Film A', folder: 'OTHERS / ITALIANI / AUTORE / FILM A', filename: 'a.jpg' },
  { id: 'b', group: 'Italiani', subgroup: 'Autore', film: 'Film B', folder: 'OTHERS / ITALIANI / AUTORE / FILM B', filename: 'b.jpg' },
  { id: 'c', group: 'Italiani', subgroup: 'Altro', film: 'Film C', folder: 'OTHERS / ITALIANI / ALTRO / FILM C', filename: 'c.jpg' },
  { id: 'd', group: 'Fahrenheit 451', subgroup: '', film: 'Fahrenheit 451', folder: 'OTHERS / FAHRENHEIT 451', filename: 'd.jpg' },
];

test('nested folders remain navigable without a generic Others category', () => {
  assert.equal(catalog.folders(items[0]).join('/'), 'AUTORE/FILM A');
  assert.equal(catalog.levels(items, 'Italiani', [])[0].options.length, 2);
  assert.equal(catalog.levels(items, 'Italiani', ['AUTORE'])[1].options.length, 2);
  assert.equal(catalog.filter(items, { category: 'Italiani', path: ['AUTORE', 'FILM B'] })[0].id, 'b');
  assert.equal(catalog.levels(items, 'Fahrenheit 451', []).length, 0);
});

test('search and favorites update facet counts without altering category membership', () => {
  const found = catalog.search(items, 'film b', new Set(['a', 'b']));
  assert.equal(found.length, 1);
  const choices = catalog.choices(items, item => item.group, found);
  assert.equal(choices.find(option => option.value === 'Italiani').count, 1);
  assert.equal(choices.find(option => option.value === 'Fahrenheit 451').count, 0);
  assert.equal(catalog.filter(items, { category: 'Italiani', path: [], film: 'Film C' }).length, 1);
});

test('all four garment colors affect fabric and trims while leaving ink untinted', () => {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(), cottonMaterial());
  const rib = new THREE.Mesh(new THREE.BoxGeometry(), cottonMaterial('rib'));
  const ink = new THREE.Mesh(new THREE.BoxGeometry(), cottonMaterial('ink'));
  root.add(body, rib, ink);
  const colors = new Set();
  for (const key of ['white', 'black', 'grey', 'vintage']) {
    setCottonColor([root], key);
    assert.equal(body.material.color.getHexString(), new THREE.Color(GARMENT_COLORS[key].base).getHexString());
    assert.equal(ink.material.color.getHexString(), 'ffffff');
    assert.notEqual(rib.material.color.getHexString(), body.material.color.getHexString());
    colors.add(body.material.color.getHexString());
  }
  assert.equal(colors.size, 4);
  root.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
});
