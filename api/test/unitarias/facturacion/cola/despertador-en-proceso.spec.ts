import { DespertadorEnProceso } from '../../../../src/modulos/facturacion/infraestructura/cola/despertador-en-proceso.js';

describe('DespertadorEnProceso (HU-02.03)', () => {
  beforeEach(() => vi.useFakeTimers({ now: 0 }));
  afterEach(() => vi.useRealTimers());

  it('mantiene un solo temporizador para la hora más próxima', async () => {
    const alSonar = vi.fn().mockResolvedValue({ lleno: false });
    const despertador = new DespertadorEnProceso(alSonar);
    despertador.programar(new Date(5_000));
    despertador.programar(new Date(1_000));
    despertador.programar(new Date(3_000));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(alSonar).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(alSonar).toHaveBeenCalledTimes(1);
  });

  it('si el lote vino lleno, vuelve a sonar enseguida; un error no lo detiene para siempre', async () => {
    const alSonar = vi
      .fn()
      .mockResolvedValueOnce({ lleno: true })
      .mockRejectedValueOnce(new Error('base caída'))
      .mockResolvedValue({ lleno: false });
    const despertador = new DespertadorEnProceso(alSonar);
    despertador.programar(new Date(0));
    await vi.advanceTimersByTimeAsync(10);
    expect(alSonar).toHaveBeenCalledTimes(2);
    despertador.programar(new Date(100));
    await vi.advanceTimersByTimeAsync(100);
    expect(alSonar).toHaveBeenCalledTimes(3);
  });

  it('detener cancela lo programado', async () => {
    const alSonar = vi.fn().mockResolvedValue({ lleno: false });
    const despertador = new DespertadorEnProceso(alSonar);
    despertador.programar(new Date(1_000));
    despertador.detener();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(alSonar).not.toHaveBeenCalled();
  });
});
