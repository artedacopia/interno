// ─── Estado global ───────────────────────────────────────────────────────────
let materiais = null; // carregado do JSON

// ─── Utilitários ─────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pulseValue(el) {
  el.classList.remove('updated');
  void el.offsetWidth; // reflow para reiniciar animação
  el.classList.add('updated');
}

// ─── Acabamentos: mostra/oculta opções conforme material ─────────────────────
function acabamento() {
  if (!materiais) return;

  const material   = document.querySelector('#material_opt').value;
  const btnVerniz  = document.querySelector('#btn-verniz');
  const btnRecorte = document.querySelector('#btn-recorte');
  const msgSem     = document.querySelector('#semacabamentos-msg');
  const chkVerniz  = document.querySelector('#verniz');
  const chkRecorte = document.querySelector('#recorte');

  const permiteVerniz  = materiais.materiais[material].verniz;
  const permiteRecorte = materiais.materiais[material].recorte;

  btnVerniz .classList.toggle('disabled', !permiteVerniz);
  btnRecorte.classList.toggle('disabled', !permiteRecorte);

  msgSem.style.display = (permiteVerniz || permiteRecorte) ? 'none' : 'flex';

  if (!permiteVerniz)  { chkVerniz.checked  = false; btnVerniz .classList.remove('active'); }
  if (!permiteRecorte) { chkRecorte.checked = false; btnRecorte.classList.remove('active'); }
}

// ─── Cálculo principal ───────────────────────────────────────────────────────
function calcular() {
  if (!materiais) return 0;

  const material  = document.querySelector('#material_opt').value;
  const quantidade = parseFloat(document.querySelector('#quantidade').value) || 0;
  const altura    = (parseFloat(document.querySelector('#altura').value)  || 0) / 100;
  const largura   = (parseFloat(document.querySelector('#largura').value) || 0) / 100;
  const comVerniz = document.querySelector('#verniz').checked;
  const comRecorte= document.querySelector('#recorte').checked;

  let complemento = materiais.materiais[material].complemento;
  const m2unitario = altura * largura;
  const m2total    = m2unitario * quantidade;
  let precom2      = 0;

  // Tabela de preço por m²
  if      (m2total >= 1)   precom2 = materiais.materiais[material].tab3;
  else if (m2total >= 0.5) precom2 = materiais.materiais[material].tab2;
  else                      precom2 = materiais.materiais[material].tab1;

  // Verniz
  if (comVerniz) {
    complemento += ' envernizado';
    precom2 += materiais.acabamentos.verniz;
  }

  // Recorte (sobrescreve preço base com tabela de acabamentos)
  if (comRecorte) {
    if      (m2total >= 1)   precom2 = materiais.acabamentos.recorte3;
    else if (m2total >= 0.5) precom2 = materiais.acabamentos.recorte2;
    else                      precom2 = materiais.acabamentos.recorte1;

    if (comVerniz) {
      complemento += ' e recortado';
      precom2 += materiais.acabamentos.verniz;
    } else {
      complemento += ' recortado';
    }
  }

  // Cálculos finais
  let totalUnitario = m2unitario * precom2;
  let total         = quantidade * totalUnitario;

  // Mínimo especial do Papel Outdoor
  if (material === 'outdoor' && m2total < 1) {
    total = materiais.materiais[material].tab1;
  }

  const uni  = quantidade !== 1 ? 'unidades' : 'unidade';
  const fica = quantidade !== 1 ? 'custam'   : 'custa';

  // ─── Atualiza detalhes ─────────────────────────────────────────────────────
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = val; pulseValue(el); }
  };

  setVal('detalheM2Uni',    m2unitario.toFixed(4) + ' m²');
  setVal('detalheM2Total',  m2total.toFixed(4)    + ' m²');
  setVal('detalheValorM2',  'R$ ' + precom2.toFixed(2));
  setVal('detalheValorUni', 'R$ ' + totalUnitario.toFixed(2));
  setVal('detalheValorTotal','R$ ' + total.toFixed(2));

  // ─── Textarea de resultado ─────────────────────────────────────────────────
  const textarea = document.getElementById('resultado-textarea');
  if (textarea) {
    textarea.value =
      `${quantidade} ${uni} ${complemento} no tamanho de ` +
      `${altura * 100}x${largura * 100}cm ${fica} R$${total.toFixed(2)}`;
  }

  return total;
}

// ─── Quantidade mínima ────────────────────────────────────────────────────────
async function quantidadeMinima() {
  const btn      = document.getElementById('btn-minimo');
  const inputQtd = document.getElementById('quantidade');

  btn.classList.add('loading');
  inputQtd.value = 1;

  let qt    = 1;
  let total = calcular();

  while (total < 20) {
    qt++;
    inputQtd.value = qt;
    total = calcular();
    await sleep(10);
  }

  btn.classList.remove('loading');
}

// ─── Copiar textarea ──────────────────────────────────────────────────────────
function copiarTexto() {
  const textarea = document.getElementById('resultado-textarea');
  const btn      = document.getElementById('btn-copiar');

  if (!textarea || !textarea.value) return;

  navigator.clipboard.writeText(textarea.value).then(() => {
    btn.classList.add('copied');
    btn.innerHTML = '✓ Copiado!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '⎘ Copiar';
    }, 2000);
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
  });
}

// ─── Inicialização ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Carrega preços do JSON
  try {
    const resp = await fetch('./materiais.json');
    materiais  = await resp.json();
  } catch (e) {
    console.error('Erro ao carregar materiais.json:', e);
    return;
  }

  const material  = document.getElementById('material_opt');
  const chkVerniz = document.getElementById('verniz');
  const chkRecorte= document.getElementById('recorte');
  const quantidade= document.getElementById('quantidade');
  const altura    = document.getElementById('altura');
  const largura   = document.getElementById('largura');
  const btnMinimo = document.getElementById('btn-minimo');
  const btnCopiar = document.getElementById('btn-copiar');

  // ─── Toggles de acabamento ─────────────────────────────────────────────────
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('disabled')) return;
      const chk = btn.querySelector('input[type="checkbox"]');
      chk.checked = !chk.checked;
      btn.classList.toggle('active', chk.checked);
      calcular();
    });
  });

  // ─── Eventos principais ────────────────────────────────────────────────────
  material.addEventListener('change',  () => { acabamento(); calcular(); });
  chkVerniz .addEventListener('change', calcular);
  chkRecorte.addEventListener('change', calcular);
  quantidade.addEventListener('input',  calcular);
  altura    .addEventListener('input',  calcular);
  largura   .addEventListener('input',  calcular);
  btnMinimo .addEventListener('click',  quantidadeMinima);
  btnCopiar .addEventListener('click',  copiarTexto);

  // ─── Inicializa estado ─────────────────────────────────────────────────────
  acabamento();
  calcular();
});
