"""
Gera o ciclo de caminhada/corrida dos personagens (Alvares e Reis).

Os spritesheets originais têm 4 quadros de 128x128 (0 parado, 1 correndo,
2 de costas, 3 pulando). Este script recorta as pernas do quadro 1, gira cada
uma em torno do quadril e monta 8 quadros novos, anexados depois dos 4
originais (quadros 4..11). Os quadros 0..3 nunca são alterados, então rodar
de novo é seguro.

Uso:  python scripts/gerarAnimacaoAndar.py [pasta_de_depuracao]
Requer Pillow.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageChops, ImageFilter

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / 'public' / 'assets' / 'personagens'
Q = 128            # lado de um quadro
ORIGINAIS = 4      # quadros que já existiam
SUPER = 4          # superamostragem usada nas rotações
CHAO = 122         # linha do chão dentro do quadro (sola da bota)

# Polígonos em coordenadas do quadro de corrida (x já sem o deslocamento de 128).
PERSONAGENS = {
    'alvares': {
        'quadril': (63, 94),
        'perna_frente': [(61, 92), (78, 91), (85, 95), (88, 104), (87, 109), (97, 112),
                         (97, 119), (87, 123), (78, 122), (66, 118), (66, 110), (71, 108),
                         (70, 105), (64, 104), (61, 99)],
        'perna_tras': [(45, 93), (61, 93), (61, 99), (64, 104), (61, 109), (52, 111),
                       (42, 111), (33, 109), (28, 105), (29, 99), (35, 95), (42, 96)],
        'escurecer': 0.55, 'clarear': 1.35, 'borda_y': 97,
    },
    'reis': {
        'quadril': (65, 86),
        'perna_frente': [(62, 82), (77, 80), (84, 83), (88, 96), (89, 104), (91, 108),
                         (101, 111), (100, 118), (90, 123), (81, 122), (79, 112), (73, 108),
                         (70, 104), (65, 100), (62, 94)],
        'perna_tras': [(56, 81), (62, 82), (62, 94), (65, 100), (70, 104), (68, 108),
                       (60, 110), (48, 109), (42, 111), (35, 109), (35, 98), (39, 93),
                       (48, 92), (52, 94), (56, 92)],
        'escurecer': 0.6, 'clarear': 1.3, 'borda_y': 96,
    },
}

# Ciclo de 8 quadros. Ângulos em graus; positivo leva o pé para trás.
# 'troca' = a perna de trás passa a ser a de frente (segunda metade do ciclo).
# (ângulo perna_frente, ângulo perna_tras, troca)
CICLO = [
    (0, 0, False),      # contato: perna da frente estendida
    (20, -30, False),   # apoio
    (38, -62, False),   # passagem: perna de apoio reta, joelho subindo
    (-10, 12, True),    # alcance
    (0, 0, True),       # contato (pernas trocadas)
    (20, -30, True),    # apoio
    (38, -62, True),    # passagem
    (-10, 12, False),   # alcance
]


def mascara(poligono):
    m = Image.new('L', (Q * SUPER, Q * SUPER), 0)
    ImageDraw.Draw(m).polygon([(x * SUPER, y * SUPER) for x, y in poligono], fill=255)
    return m.resize((Q, Q), Image.LANCZOS)


def engordar(masc, a_partir_de_y):
    """Alarga a máscara 2px abaixo de uma linha, para o contorno preto ir junto com a perna."""
    larga = masc.filter(ImageFilter.MaxFilter(5))
    larga.paste(0, (0, 0, Q, a_partir_de_y))
    return ImageChops.lighter(masc, larga)


def recortar(quadro, masc):
    camada = quadro.copy()
    camada.putalpha(ImageChops.multiply(quadro.getchannel('A'), masc))
    return camada


def ganho(camada, fator):
    rgb = ImageEnhance.Brightness(camada.convert('RGB')).enhance(fator)
    rgb.putalpha(camada.getchannel('A'))
    return rgb


def girar(camada, angulo, pivo):
    if angulo == 0:
        return camada
    grande = camada.resize((Q * SUPER, Q * SUPER), Image.NEAREST)
    # PIL gira no sentido anti-horário; na tela, ângulo positivo leva o pé para trás.
    grande = grande.rotate(-angulo, resample=Image.BICUBIC,
                           center=(pivo[0] * SUPER, pivo[1] * SUPER))
    return grande.resize((Q, Q), Image.BOX)


def base_y(img):
    caixa = img.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox()
    return caixa[3] if caixa else 0


def montar(nome, cfg, depurar=None):
    caminho = PASTA / f'{nome}.png'
    folha = Image.open(caminho).convert('RGBA')
    originais = folha.crop((0, 0, Q * ORIGINAIS, Q))
    corrida = originais.crop((Q, 0, Q * 2, Q))

    m_frente = engordar(mascara(cfg['perna_frente']), cfg['borda_y'])
    m_tras = ImageChops.subtract(engordar(mascara(cfg['perna_tras']), cfg['borda_y']), m_frente)
    perna_frente = recortar(corrida, m_frente)
    perna_tras = recortar(corrida, m_tras)
    m_pernas = ImageChops.add(m_frente, m_tras)
    corpo = recortar(corrida, ImageChops.invert(m_pernas))

    # remendo fixo no quadril: tapa o vão que aparece quando as pernas giram
    px, py = cfg['quadril']
    m_remendo = Image.new('L', (Q * SUPER, Q * SUPER), 0)
    ImageDraw.Draw(m_remendo).ellipse(
        [(px - 7) * SUPER, (py - 7) * SUPER, (px + 7) * SUPER, (py + 7) * SUPER], fill=255)
    m_remendo = ImageChops.multiply(m_remendo.resize((Q, Q), Image.LANCZOS), m_pernas)
    remendo = ganho(recortar(corrida, m_remendo), 0.75)

    quadros = []
    for ang_frente, ang_tras, troca in CICLO:
        f = girar(perna_frente, ang_frente, cfg['quadril'])
        t = girar(perna_tras, ang_tras, cfg['quadril'])
        pernas = Image.new('RGBA', (Q, Q), (0, 0, 0, 0))
        if troca:
            # a perna estendida vira a de trás (escura) e a dobrada vem para a frente
            pernas.alpha_composite(ganho(f, cfg['escurecer']))
            pernas.alpha_composite(ganho(t, cfg['clarear']))
        else:
            pernas.alpha_composite(t)
            pernas.alpha_composite(f)

        quadro = Image.new('RGBA', (Q, Q), (0, 0, 0, 0))
        quadro.alpha_composite(remendo)
        quadro.alpha_composite(pernas)
        quadro.alpha_composite(corpo)

        # mantém a sola no chão: o corpo sobe e desce conforme a perna de apoio
        desloc = CHAO - base_y(pernas)
        final = Image.new('RGBA', (Q, Q), (0, 0, 0, 0))
        final.alpha_composite(quadro, (0, desloc)) if desloc >= 0 else \
            final.alpha_composite(quadro.crop((0, -desloc, Q, Q)), (0, 0))
        quadros.append(final)

    nova = Image.new('RGBA', (Q * (ORIGINAIS + len(quadros)), Q), (0, 0, 0, 0))
    nova.paste(originais, (0, 0))
    for i, q in enumerate(quadros):
        nova.paste(q, (Q * (ORIGINAIS + i), 0))
    nova.save(caminho)
    print(f'{nome}: {nova.width}x{nova.height} ({ORIGINAIS} originais + {len(quadros)} de caminhada)')

    if depurar:
        fundo = (40, 110, 70, 255)
        tira = Image.new('RGBA', (Q * len(quadros), Q), fundo)
        for i, q in enumerate(quadros):
            tira.alpha_composite(q, (Q * i, 0))
        tira.resize((tira.width * 3, tira.height * 3), Image.NEAREST).save(depurar / f'{nome}_ciclo.png')
        gif = []
        for q in quadros:
            g = Image.new('RGBA', (Q, Q), fundo)
            g.alpha_composite(q)
            gif.append(g.resize((Q * 3, Q * 3), Image.NEAREST).convert('P'))
        gif[0].save(depurar / f'{nome}_ciclo.gif', save_all=True, append_images=gif[1:],
                    duration=83, loop=0)
        # máscaras sobre o quadro original, para conferir os recortes
        conf = Image.new('RGBA', (Q, Q), fundo)
        conf.alpha_composite(corrida)
        conf.alpha_composite(Image.merge('RGBA', (m_frente.point(lambda _: 255), m_frente.point(lambda _: 0),
                                                  m_frente.point(lambda _: 255), m_frente.point(lambda a: a // 3))))
        conf.alpha_composite(Image.merge('RGBA', (m_tras.point(lambda _: 0), m_tras.point(lambda _: 255),
                                                  m_tras.point(lambda _: 255), m_tras.point(lambda a: a // 3))))
        conf.resize((Q * 8, Q * 8), Image.NEAREST).save(depurar / f'{nome}_mascaras.png')


if __name__ == '__main__':
    pasta_dep = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for nome_p, cfg_p in PERSONAGENS.items():
        montar(nome_p, cfg_p, pasta_dep)
