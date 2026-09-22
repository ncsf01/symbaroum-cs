// DOMContentLoaded = só roda depois que o HTML termina de carregar
document.addEventListener("DOMContentLoaded", () => {
  setupXpCalculation();
  setupAttributeCalculations();
  setupToughnessButtons();
  setupCorruptionButtons();
  setupRandomizeButton();
  setupAbilities();
});

/* ============================
   XP disponível = total - spent
   ============================ */
function setupXpCalculation() {
  // Busca os tres campos que participam do calculo de XP.
  const totalInput = document.getElementById("charXpTotal");
  const spentInput = document.getElementById("charXpSpent");
  const availableInput = document.getElementById("charXpAvailable");

  function recalculate() {
    // Converte o texto dos inputs em numeros; campos vazios viram zero.
    const total = parseInt(totalInput.value, 10) || 0; // || 0 = fallback se o campo estiver vazio/inválido
    const spent = parseInt(spentInput.value, 10) || 0;
    availableInput.value = total - spent;
  }

  // Recalcula imediatamente enquanto o usuario digita em qualquer dos dois campos.
  totalInput.addEventListener("input", recalculate);
  spentInput.addEventListener("input", recalculate);
  recalculate(); // roda uma vez no load, pro valor já aparecer certo
}

/* ==================================================
   Atributos → Combat Statistics (fórmulas do livro)
   ================================================== */
function setupAttributeCalculations() {
  // Seleciona todos os inputs que representam atributos do personagem.
  const attributeInputs = document.querySelectorAll(".attr-input");

  function recalculateCombatStats() {
    // data-attr identifica qual atributo cada input representa.
    // monta um objeto tipo { acc: 10, cun: 10, ... } a partir de data-attr de cada input
    const values = {};
    attributeInputs.forEach((input) => {
      values[input.dataset.attr] = parseInt(input.value, 10) || 0;
    });

    // Estas formulas transformam atributos em estatisticas derivadas.
    const toughness = Math.max(values.str, 10);          // Strong, mín. 10
    const painThreshold = Math.ceil(values.str / 2);      // Strong/2, cima
    const corruptionThreshold = Math.ceil(values.res / 2);// Resolute/2, cima
    // Por enquanto a armadura ainda nao participa do calculo.
    const armorImpeding = 0;                               
    const defense = values.qui - armorImpeding;            // Quick - Impeding
    const initiative = values.qui;                         // = Quick

    // .textContent altera o texto dos spans; .value seria usado em inputs.
    document.getElementById("statToughness").textContent = toughness;
    document.getElementById("statPainThreshold").textContent = painThreshold;
    document.getElementById("statDefense").textContent = defense;
    document.getElementById("statCorruptionThreshold").textContent = corruptionThreshold;
    document.getElementById("statInitiative").textContent = initiative;

    updateToughnessTracker(toughness);
    updateCorruptionTracker(values.res, corruptionThreshold);
  }

  // Toda alteracao de atributo atualiza as estatisticas relacionadas.
  attributeInputs.forEach((input) => input.addEventListener("input", recalculateCombatStats));
  recalculateCombatStats(); // roda uma vez no load
}

/* ================================================
   Current Toughness — HP controlado pelo jogador,
   cor muda de saudável → ferido → crítico (sangue)
   ================================================ */
// Estado mutavel: representa a Toughness atual, independente da maxima.
let currentToughness = 10;

function updateToughnessTracker(max) {
  // Atualiza numeros, largura da barra e classe visual do estado da vida.
  if (currentToughness > max) currentToughness = max; // impede atual > maxima

  document.getElementById("toughnessCurrent").textContent = currentToughness;
  document.getElementById("toughnessMaxEcho").textContent = max;

  // O operador ternario evita uma divisao invalida se max for zero.
  const percent = max > 0 ? (currentToughness / max) * 100 : 0;
  const bar = document.getElementById("toughnessBar");

  // width e uma propriedade CSS, por isso o numero precisa terminar em "%".
  bar.style.width = percent + "%";

  // Classifica em 3 faixas e troca a classe de cor da propria barra.
  bar.classList.remove("tough-healthy", "tough-wounded", "tough-critical");

  if (percent > 60) {
    bar.classList.add("tough-healthy");
  } else if (percent > 25) {
    bar.classList.add("tough-wounded");
  } else {
    bar.classList.add("tough-critical");
  }
}

function setupToughnessButtons() {
  // Liga os botoes ao estado atual e nunca deixa o valor sair de 0..max.
  const minusBtn = document.getElementById("toughnessMinus");
  const plusBtn = document.getElementById("toughnessPlus");

  minusBtn.addEventListener("click", () => {
    // O botao de menos nao permite Toughness negativa.
    if (currentToughness > 0) {
      currentToughness -= 1;
      const max = parseInt(document.getElementById("statToughness").textContent, 10);
      updateToughnessTracker(max);
    }
  });

  plusBtn.addEventListener("click", () => {
    // O botao de mais nao permite ultrapassar a Toughness maxima.
    const max = parseInt(document.getElementById("statToughness").textContent, 10);
    if (currentToughness < max) {
      currentToughness += 1;
      updateToughnessTracker(max);
    }
  });
}

/* ==========================================
   Corrupção: Temporary + Permanent (livro,
   "The Power of Corruption" / Table 25)
   ========================================== */
// Estados separados porque a corrupcao temporaria e a permanente funcionam
// de forma diferente, embora as duas componham o total exibido na barra.
let temporaryCorruption = 0;
let permanentCorruption = 0;
let lastResolute = 10;   // cacheados pros botões +/- funcionarem sem reler os atributos
let lastThreshold = 5;

function setupCorruptionButtons() {
  // Localiza os quatro botoes dos dois contadores de corrupcao.
  const tempMinus = document.getElementById("tempCorrMinus");
  const tempPlus = document.getElementById("tempCorrPlus");
  const permMinus = document.getElementById("permCorrMinus");
  const permPlus = document.getElementById("permCorrPlus");

  tempMinus.addEventListener("click", () => {
    // Corrupcao nao pode ficar abaixo de zero.
    if (temporaryCorruption > 0) {
      temporaryCorruption -= 1;
      updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });
  tempPlus.addEventListener("click", () => {
    temporaryCorruption += 1;
    updateCorruptionTracker(lastResolute, lastThreshold);
  });
  permMinus.addEventListener("click", () => {
    if (permanentCorruption > 0) {
      permanentCorruption -= 1;
      updateCorruptionTracker(lastResolute, lastThreshold);
    }
  });
  permPlus.addEventListener("click", () => {
    permanentCorruption += 1;
    updateCorruptionTracker(lastResolute, lastThreshold);
  });
}

function updateCorruptionTracker(resolute, threshold) {
  // Atualiza contadores, barras, marcador de limite e texto de status.
  lastResolute = resolute;
  lastThreshold = threshold;

  document.getElementById("tempCorrValue").textContent = temporaryCorruption;
  document.getElementById("permCorrValue").textContent = permanentCorruption;

  // A barra e o status usam a soma das duas formas de corrupcao.
  const total = temporaryCorruption + permanentCorruption;
  const scale = resolute > 0 ? resolute : 1; // evita divisão por zero

  // permanente = base da barra; temporária desenhada por cima, largura = TOTAL (cobre a base + sobra visível)
  // Math.min impede que uma barra ultrapasse visualmente 100%.
  const permPercent = Math.min((permanentCorruption / scale) * 100, 100);
  const totalPercent = Math.min((total / scale) * 100, 100);
  document.getElementById("permCorrBar").style.width = permPercent + "%";
  document.getElementById("tempCorrBar").style.width = totalPercent + "%";

  const thresholdPercent = Math.min((threshold / scale) * 100, 100);
  document.getElementById("corrThresholdMarker").style.left = thresholdPercent + "%";

  // Define o texto e se o status deve receber a classe visual de perigo.
  const statusEl = document.getElementById("corrStatus");
  let statusText;
  let isDanger = false;

  if (total >= resolute) {
    statusText = "Abomination risk!";
    isDanger = true;
  } else if (total >= threshold) {
    statusText = "Blight-marked";
    isDanger = true;
  } else if (total >= 1) {
    statusText = "Blight-stricken";
  } else {
    statusText = "Untainted";
  }

  statusEl.textContent = statusText;
  statusEl.classList.toggle("corr-status-danger", isDanger);
}

/* ===========================================
   Random Character — distribui 5·7·9·10·10·11·13·15
   =========================================== */
function setupRandomizeButton() {
  // Distribui os valores padrao aleatoriamente entre os oito atributos.
  const btn = document.getElementById("randomizeAttrs");
  const attributeInputs = document.querySelectorAll(".attr-input");
  const typicalValues = [5, 7, 9, 10, 10, 11, 13, 15];

  btn.addEventListener("click", () => {
    // Copia e embaralha para manter typicalValues intacto entre cliques.
    const shuffled = shuffleArray([...typicalValues]); // [...array] copia, não mexe no original

    attributeInputs.forEach((input, i) => {
      // O indice associa cada valor embaralhado a um input diferente.
      input.value = shuffled[i];
      // .value = x NÃO dispara "input" sozinho, então disparamos na mão pra
      // reaproveitar os listeners que já existem (recalculateCombatStats etc)
      input.dispatchEvent(new Event("input"));
    });
  });
}

// Fisher-Yates: percorre de trás pra frente, troca cada posição com uma sorteada antes dela
function shuffleArray(array) {
  // Retorna a propria array recebida, depois de embaralha-la.
  for (let i = array.length - 1; i > 0; i--) {
    // Escolhe uma posicao valida entre zero e i, inclusive.
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* ================================================
   Abilities & Powers — lista dinâmica (add/remove)
   ================================================ */

// contador só pra gerar um id único (name="ability-level-N") em cada <select>,
// não tem relação com quantidade de habilidades salvas
// Gera identificadores numericos unicos para futuras linhas de habilidade.
let abilityRowCount = 0;

function setupAbilities() {
  // O botao delega a criacao da linha para addAbilityRow().
  document.getElementById("addAbilityBtn").addEventListener("click", () => {
    addAbilityRow();
  });
}

// cria e insere uma linha nova no #abilitiesList; parâmetros = valores iniciais (vazio por padrão)
function addAbilityRow(name = "", level = "novice", description = "") {
  // Cria uma habilidade com valores iniciais opcionais.
  abilityRowCount += 1;
  const rowId = abilityRowCount;

  // A template string descreve o HTML interno da nova linha.
  const wrapper = document.createElement("div");
  wrapper.className = "ability-row";
  wrapper.dataset.level = level; // é isso que o CSS [data-level="..."] lê pra colorir a borda

  wrapper.innerHTML = `
    <div class="ability-row-header">
      <select class="ability-level-select" data-role="level">
        <option value="novice">Novice</option>
        <option value="adept">Adept</option>
        <option value="master">Master</option>
      </select>
      <input type="text" class="field-input ability-name-input" data-role="name"
             placeholder="Ability name..." value="${name}">
      <button type="button" class="ability-remove-btn" title="Remove">×</button>
    </div>
    <input type="text" class="field-input ability-desc-input" data-role="description"
           placeholder="Short effect description..." value="${description}">
  `;

  // Define no select a opcao correspondente ao nivel recebido.
  wrapper.querySelector('[data-role="level"]').value = level;

  // O data-level muda ao vivo; o CSS usa esse atributo para trocar a borda.
  wrapper.querySelector('[data-role="level"]').addEventListener("change", (event) => {
    wrapper.dataset.level = event.target.value;
  });

  // O botao remove somente esta linha, sem afetar as outras habilidades.
  wrapper.querySelector(".ability-remove-btn").addEventListener("click", () => {
    wrapper.remove();
  });

  // Insere a linha no container da lista e devolve o elemento criado.
  document.getElementById("abilitiesList").appendChild(wrapper);
  return wrapper; // permite reutilizar a funcao para dados do compendio
}
