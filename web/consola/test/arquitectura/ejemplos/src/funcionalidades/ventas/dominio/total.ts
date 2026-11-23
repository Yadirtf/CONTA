// Ejemplo que rompe las reglas a propósito: el dominio importa react, node y otras capas.
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { pedirVentas } from '../datos/pedir-ventas';

export const total = [useState, readFileSync, pedirVentas].length;
