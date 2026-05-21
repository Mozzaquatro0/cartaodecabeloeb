/* Variáveis Globais de Estado do Sistema */
let registrosPorPagina = 25;
let paginaAtual = 1;
let efetivoSU = JSON.parse(localStorage.getItem('eb_efetivo_su')) || [];
let militarSelecionadoIndex = null;
let abaAtual = 'ficha';
let buscaAtualStr = "";
let filtroStatusAtual = "TODOS";

/* Constantes Institucionais */
const urlBrasao = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Coat_of_arms_of_Brazil_%28variant_B%26W_from_STF%29.svg/250px-Coat_of_arms_of_Brazil_%28variant_B%26W_from_STF%29.svg.png";
const m1 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
const m2 = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const ordemPrecedencia = { "CB": 1, "SD EP": 2, "SD EV": 3 };

if (localStorage.getItem('eb_su_avancado')) {
    const cfgSu = document.getElementById('cfg-su');
    if (cfgSu) cfgSu.value = localStorage.getItem('eb_su_avancado');
}

/* Funções Core */
function ordenarEfetivo() {
    efetivoSU.sort((a, b) => {
        let pesoA = ordemPrecedencia[a.grad] || 99;
        let pesoB = ordemPrecedencia[b.grad] || 99;
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.nome.localeCompare(b.nome);
    });
}

function salvarDadosGerais() {
    const cfgSu = document.getElementById('cfg-su');
    if (cfgSu) localStorage.setItem('eb_su_avancado', cfgSu.value);
}
function salvarBancoDados() { localStorage.setItem('eb_efetivo_su', JSON.stringify(efetivoSU)); }

function editarDadoMilitar(index, campo, valor) {
    if (campo === 'nome' || campo === 'grad') {
        efetivoSU[index][campo] = valor.trim().toUpperCase();
    } else if (campo === 'numero') {
        efetivoSU[index][campo] = valor.trim();
    } else if (campo === 'dataCartao') {
        efetivoSU[index][campo] = valor;
    }
    ordenarEfetivo();
    salvarBancoDados();
    renderizarSistema();
}

function removerMilitar(index) {
    if (confirm("Remover este militar da lista?")) {
        efetivoSU.splice(index, 1);
        salvarBancoDados();
        renderizarSistema();
    }
}

/* Backup */
function exportarBackupDados() {
    if (efetivoSU.length === 0) { alert("Não há dados na lista!"); return; }
    const cfgSu = document.getElementById('cfg-su');
    const dadosExportar = { subunidade: cfgSu ? cfgSu.value : '', efetivo: efetivoSU };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dadosExportar, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "backup_cabelo_SU.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importarBackupDados(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dadosImportados = JSON.parse(e.target.result);
            if (dadosImportados.subunidade && Array.isArray(dadosImportados.efetivo)) {
                if (confirm("Deseja substituir a lista atual pelo backup?")) {
                    const cfgSu = document.getElementById('cfg-su');
                    if (cfgSu) cfgSu.value = dadosImportados.subunidade;
                    efetivoSU = dadosImportados.efetivo;
                    efetivoSU.forEach(m => {
                        if (!m.historicoOcorrencias) m.historicoOcorrencias = [];
                        if (m.qtdCartoes === undefined) m.qtdCartoes = m.dataCartao ? 1 : 0;
                    });
                    ordenarEfetivo();
                    salvarDadosGerais();
                    salvarBancoDados();
                    renderizarSistema();
                    alert("Backup carregado com sucesso!");
                }
            } else { alert("Formato inválido!"); }
        } catch (err) { alert("Erro ao ler backup."); }
        input.value = "";
    };
    reader.readAsText(file);
}

function importarArquivoTexto(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const lines = e.target.result.split(/\r?\n/);
        let pgAtual = "";
        let nomesNoTxt = [];
        lines.forEach(linha => {
            let inlineCleanup = linha.trim().toUpperCase();
            if (!inlineCleanup) return;
            if (inlineCleanup.startsWith("CB:") || inlineCleanup === "CB") pgAtual = "CB";
            else if (inlineCleanup.startsWith("SD EP:") || inlineCleanup === "SD EP") pgAtual = "SD EP";
            else if (inlineCleanup.startsWith("SD EV:") || inlineCleanup === "SD EV") pgAtual = "SD EV";
            else if (pgAtual !== "") nomesNoTxt.push({ grad: pgAtual, nome: inlineCleanup });
        });

        if (nomesNoTxt.length === 0) { alert("Nenhum nome válido encontrado!"); return; }
        let adicionados = 0;
        let mantidos = 0;
        let excluidos = 0;
        let efetivoFiltrado = efetivoSU.filter(mSis => {
            const existe = nomesNoTxt.some(mTxt => mTxt.nome === mSis.nome && mTxt.grad === mSis.grad);
            if (!existe) excluidos++;
            return existe;
        });
        nomesNoTxt.forEach(mTxt => {
            const jaExiste = efetivoFiltrado.some(mSis => mSis.nome === mTxt.nome && mSis.grad === mTxt.grad);
            if (!jaExiste) {
                efetivoFiltrado.push({
                    grad: mTxt.grad,
                    nome: mTxt.nome,
                    dataCartao: "",
                    imprimir: false,
                    qtdCartoes: 0,
                    historicoOcorrencias: []
                });
                adicionados++;
            } else {
                mantidos++;
            }
        });
        efetivoSU = efetivoFiltrado;
        ordenarEfetivo();
        salvarBancoDados();
        renderizarSistema();
        input.value = "";
        alert(`Sincronização Concluída!\n\n➕ Cadastrados: ${adicionados}\n🔄 Mantidos: ${mantidos}\n❌ Removidos: ${excluidos}`);
    };
    reader.readAsText(file);
}

function resetarSistemaCompleto() {
    if (confirm("⚠ ATENÇÃO: Deseja apagar permanentemente TODO o efetivo, históricos e registros?")) {
        if (confirm("CONFIRMAÇÃO FINAL: Limpar banco de dados para o próximo ano instrucional?")) {
            efetivoSU = [];
            salvarBancoDados();
            renderizarSistema();
            alert("Sistema zerado.");
        }
    }
}

/* Cadastro Manual */
function iniciarCadastroManualFluxo() {
    let qtd = prompt("Quantos militares deseja adicionar manualmente?", "1");
    if (qtd === null) return;
    qtd = parseInt(qtd);
    if (isNaN(qtd) || qtd <= 0) { alert("Quantidade inválida informada!"); return; }

    const containerInputs = document.getElementById('corpo-inputs-manuais');
    if (!containerInputs) return;
    containerInputs.innerHTML = "";

    for (let k = 0; k < qtd; k++) {
        containerInputs.innerHTML += `
            <div class="row-add-manual">
                <input type="text" id="add-manual-grad-${k}" placeholder="Ex: SD EV" value="SD EV" style="font-weight:bold; text-align:center;">
                <input type="text" id="add-manual-nome-${k}" placeholder="NOME DE GUERRA">
            </div>
            <div class="row-add-manual">
                <input type="text" id="add-manual-num-${k}" placeholder="NÚMERO DO SOLDADO" style="text-align:center;">
            </div>
        `;
    }
    const modal = document.getElementById('modal-cadastro-manual');
    if (modal) modal.style.display = 'flex';
}

function submeterMilitaresManuais() {
    const containerInputs = document.getElementById('corpo-inputs-manuais');
    if (!containerInputs) return;
    const linhas = containerInputs.getElementsByClassName('row-add-manual');
    let adicionadosQtd = 0;

    for (let k = 0; k < linhas.length; k++) {
        const gradInput = document.getElementById(`add-manual-grad-${k}`);
        const nomeInput = document.getElementById(`add-manual-nome-${k}`);
        const numInput = document.getElementById(`add-manual-num-${k}`);
        if (!gradInput || !nomeInput) continue;

        const gradVal = gradInput.value.trim().toUpperCase();
        const nomeVal = nomeInput.value.trim().toUpperCase();
        const numVal = numInput ? numInput.value.trim() : "";

        if (gradVal && nomeVal) {
            const jaExiste = efetivoSU.some(m => m.nome === nomeVal && m.grad === gradVal);
            if (!jaExiste) {
                efetivoSU.push({
                    grad: gradVal,
                    nome: nomeVal,
                    numero: numVal,
                    dataCartao: "",
                    imprimir: false,
                    qtdCartoes: 0,
                    historicoOcorrencias: []
                });
                adicionadosQtd++;
            }
        }
    }

    if (adicionadosQtd > 0) {
        ordenarEfetivo();
        salvarBancoDados();
        renderizarSistema();
        fecharModal('modal-cadastro-manual');
        alert(`Sucesso! ${adicionadosQtd} novos militares integrados à Ficha Auxiliar.`);
    } else {
        alert("Nenhum militar novo válido foi cadastrado.");
    }
}

/* Métricas */
function verificarValidade(dataString) {
    if (!dataString) return "SEM CARTÃO";
    const dataCartao = new Date(dataString);
    const hoje = new Date();
    dataCartao.setMonth(dataCartao.getMonth() + 12);
    return hoje > dataCartao ? "VENCIDO" : "VÁLIDO";
}

function atualizarIndicadores() {
    let total = efetivoSU.length;
    let validos = 0;
    let vencidos = 0;
    let semCartao = 0;
    efetivoSU.forEach(m => {
        let status = verificarValidade(m.dataCartao);
        if (status === 'VÁLIDO') validos++;
        else if (status === 'VENCIDO') vencidos++;
        else semCartao++;
    });
    if (document.getElementById('stat-total')) document.getElementById('stat-total').innerText = total;
    if (document.getElementById('stat-valido')) document.getElementById('stat-valido').innerText = validos;
    if (document.getElementById('stat-vencido')) document.getElementById('stat-vencido').innerText = vencidos;
    if (document.getElementById('stat-sem-cartao')) document.getElementById('stat-sem-cartao').innerText = semCartao;
}

/* Histórico */
function abrirHistorico(index) {
    militarSelecionadoIndex = index;
    const militar = efetivoSU[index];
    const modalTitulo = document.getElementById('modal-militar-titulo');
    if (modalTitulo) modalTitulo.innerText = `Histórico de Ficha: ${militar.grad} ${militar.nome}`;
    const novaOcorrencia = document.getElementById('modal-nova-ocorrencia');
    if (novaOcorrencia) novaOcorrencia.value = "";

    renderizarListaOcorrenciasModal();
    const modal = document.getElementById('modal-historico');
    if (modal) modal.style.display = 'flex';
}

function renderizarListaOcorrenciasModal() {
    const militar = efetivoSU[militarSelecionadoIndex];
    const listaDiv = document.getElementById('modal-lista-historico');
    if (!listaDiv) return;
    listaDiv.innerHTML = "";

    if (!militar.historicoOcorrencias || militar.historicoOcorrencias.length === 0) {
        listaDiv.innerHTML = `<div style="color:#777; font-size:12px; text-align:center; padding:10px;">Nenhum relato ou extravio registrado para este militar.</div>`;
        return;
    }

    militar.historicoOcorrencias.forEach((oc, ocIndex) => {
        listaDiv.innerHTML += `
            <div class="history-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 8px 6px;">
                <div style="flex: 1;">
                    <span class="history-date">[${oc.data}]</span> 
                    <span>${escapeHtml(oc.texto)}</span>
                </div>
                <div style="display: flex; gap: 4px; shrink: 0;">
                    <button onclick="editarOcorrenciaDados(${ocIndex})" title="Editar relato" style="background: #ffc107; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 11px;">✏️</button>
                    <button onclick="apagarOcorrenciaDados(${ocIndex})" title="Apagar relato" style="background: #dc3545; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer; font-size: 11px; color: white;">🗑️</button>
                </div>
            </div>
        `;
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function salvarOcorrenciaModal() {
    if (militarSelecionadoIndex === null) return;
    const textoInput = document.getElementById('modal-nova-ocorrencia');
    if (!textoInput) return;
    const texto = textoInput.value.trim();
    if (!texto) {
        alert("Por favor, digite o motivo ou o relato antes de salvar!");
        return;
    }

    const hoje = new Date();
    const dataFormatada = hoje.toLocaleDateString('pt-BR') + ' ' + hoje.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    if (!efetivoSU[militarSelecionadoIndex].historicoOcorrencias) efetivoSU[militarSelecionadoIndex].historicoOcorrencias = [];
    efetivoSU[militarSelecionadoIndex].historicoOcorrencias.unshift({
        data: dataFormatada,
        texto: texto.toUpperCase()
    });

    salvarBancoDados();
    renderizarListaOcorrenciasModal();
    textoInput.value = "";
    renderizarSistema();
}

function editarOcorrenciaDados(ocIndex) {
    const militar = efetivoSU[militarSelecionadoIndex];
    const ocorrenciaAtual = militar.historicoOcorrencias[ocIndex];

    let textoBase = ocorrenciaAtual.texto.split(" (ALTERADO EM")[0];

    let novoTexto = prompt("Altere o relato da ocorrência:", textoBase);
    if (novoTexto === null) return;
    novoTexto = novoTexto.trim().toUpperCase();

    if (!novoTexto) {
        alert("O texto não pode ficar vazio.");
        return;
    }

    if (novoTexto !== textoBase) {
        const hoje = new Date();
        const dataAlteracao = hoje.toLocaleDateString('pt-BR') + ' às ' + hoje.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        ocorrenciaAtual.texto = `${novoTexto} (ALTERADO EM ${dataAlteracao})`;

        salvarBancoDados();
        renderizarListaOcorrenciasModal();
        renderizarSistema();
    }
}

function apagarOcorrenciaDados(ocIndex) {
    if (confirm("Deseja apagar definitivamente esta ocorrência/relato do histórico do militar?")) {
        efetivoSU[militarSelecionadoIndex].historicoOcorrencias.splice(ocIndex, 1);

        salvarBancoDados();
        renderizarListaOcorrenciasModal();
        renderizarSistema();
    }
}

function fecharModal(idModal) {
    const modal = document.getElementById(idModal);
    if (modal) modal.style.display = 'none';
    militarSelecionadoIndex = null;
}

/* Filtros */
function capturarFiltrosDinamicos() {
    const searchInput = document.getElementById('search-militar-input');
    const filterSelect = document.getElementById('filter-status-select');
    buscaAtualStr = searchInput ? searchInput.value.trim().toUpperCase() : "";
    filtroStatusAtual = filterSelect ? filterSelect.value : "TODOS";
    paginaAtual = 1;
    renderizarSistema();
}

function mudarAba(tipo) {
    abaAtual = tipo;
    const btnFrente = document.getElementById('btn-frente');
    const btnVerso = document.getElementById('btn-verso');
    const btnDobra = document.getElementById('btn-dobra');
    const btnFicha = document.getElementById('btn-ficha');

    if (btnFrente) btnFrente.classList.remove('active-btn');
    if (btnVerso) btnVerso.classList.remove('active-btn');
    if (btnDobra) btnDobra.classList.remove('active-btn');
    if (btnFicha) btnFicha.classList.remove('active-btn');

    if (tipo === 'frente' && btnFrente) btnFrente.classList.add('active-btn');
    if (tipo === 'verso' && btnVerso) btnVerso.classList.add('active-btn');
    if (tipo === 'dobra' && btnDobra) btnDobra.classList.add('active-btn');
    if (tipo === 'ficha' && btnFicha) btnFicha.classList.add('active-btn');

    renderizarSistema();
}

function toggleImprimir(index, checkbox) {
    efetivoSU[index].imprimir = checkbox.checked;
    salvarBancoDados();
    atualizarCheckboxTodos();
}

/* Paginação */
function mudarQuantidadePorPagina() {
    const select = document.getElementById('rowsPerPage');
    registrosPorPagina = parseInt(select.value);
    paginaAtual = 1;
    renderizarSistema();
}

function primeiraPagina() {
    paginaAtual = 1;
    renderizarSistema();
}

function paginaAnterior() {
    if (paginaAtual > 1) {
        paginaAtual--;
        renderizarSistema();
    }
}

function proximaPagina() {
    const totalPaginas = Math.ceil(efetivoSU.filter(m => {
        const correspondeBusca = m.nome.toUpperCase().includes(buscaAtualStr) || m.grad.toUpperCase().includes(buscaAtualStr);
        const statusMilitar = verificarValidade(m.dataCartao);
        return correspondeBusca && (filtroStatusAtual === 'TODOS' || statusMilitar === filtroStatusAtual);
    }).length / registrosPorPagina);

    if (paginaAtual < totalPaginas) {
        paginaAtual++;
        renderizarSistema();
    }
}

function ultimaPagina() {
    const totalPaginas = Math.ceil(efetivoSU.filter(m => {
        const correspondeBusca = m.nome.toUpperCase().includes(buscaAtualStr) || m.grad.toUpperCase().includes(buscaAtualStr);
        const statusMilitar = verificarValidade(m.dataCartao);
        return correspondeBusca && (filtroStatusAtual === 'TODOS' || statusMilitar === filtroStatusAtual);
    }).length / registrosPorPagina);

    paginaAtual = totalPaginas > 0 ? totalPaginas : 1;
    renderizarSistema();
}

function atualizarPaginacaoBottom(totalPaginas) {
    const paginaAtualSpan = document.getElementById('pagina-atual-bottom');
    const totalPaginasSpan = document.getElementById('total-paginas-bottom');
    const btnPrimeira = document.getElementById('btn-primeira-bottom');
    const btnAnterior = document.getElementById('btn-anterior-bottom');
    const btnProxima = document.getElementById('btn-proxima-bottom');
    const btnUltima = document.getElementById('btn-ultima-bottom');

    if (paginaAtualSpan) paginaAtualSpan.innerText = paginaAtual;
    if (totalPaginasSpan) totalPaginasSpan.innerText = totalPaginas;

    if (btnPrimeira) btnPrimeira.disabled = (paginaAtual <= 1);
    if (btnAnterior) btnAnterior.disabled = (paginaAtual <= 1);
    if (btnProxima) btnProxima.disabled = (paginaAtual >= totalPaginas);
    if (btnUltima) btnUltima.disabled = (paginaAtual >= totalPaginas);
}

/* Impressão */
function executarImpressao() {
    const selecionados = efetivoSU.filter(m => m.imprimir);
    if (selecionados.length === 0) {
        alert("⚠️ Nenhum militar marcado para impressão! Marque as caixinhas na coluna 'Imprimir' primeiro.");
        return;
    }

    const dataAtual = new Date();
    const dataFormatada = dataAtual.toISOString().split('T')[0];

    for (let i = 0; i < efetivoSU.length; i++) {
        if (efetivoSU[i].imprimir) {
            efetivoSU[i].dataCartao = dataFormatada;
        }
    }

    salvarBancoDados();
    renderizarSistema();

    if (abaAtual === 'ficha') {
        mudarAba('frente');
    }

    setTimeout(() => {
        window.print();
    }, 300);
}

function gerarTabelaHTML(meses) {
    let h = '<table style="width:100%; height:100%; border-collapse: collapse; border: 1px solid black;">';
    h += '<thead>';
    h += '<tr>';
    h += '<th style="width: 14%; border: 1px solid black; padding: 4px; background-color: #f0f0f0; font-size: 8pt;">MÊS</th>';
    h += '<th style="width: 13%; border: 1px solid black; padding: 4px; background-color: #f0f0f0; font-size: 8pt;">DIA</th>';
    h += '<th style="width: 30%; border: 1px solid black; padding: 4px; background-color: #f0f0f0; font-size: 8pt;">RUBRICA DO CMT SU</th>';
    h += '<th style="width: 13%; border: 1px solid black; padding: 4px; background-color: #f0f0f0; font-size: 8pt;">DIA</th>';
    h += '<th style="width: 30%; border: 1px solid black; padding: 4px; background-color: #f0f0f0; font-size: 8pt;">RUBRICA DO CMT SU</th>';
    h += '</tr>';
    h += '</thead>';
    h += '<tbody>';
    
    for (let i = 0; i < meses.length; i++) {
        const mes = meses[i];
        // Linha 1
        h += '<tr style="border: 1px solid black;">';
        h += '<td rowspan="3" style="border: 1px solid black; padding: 6px 4px; font-weight: bold; text-align: center; font-size: 8pt; vertical-align: middle; background-color: #fafafa;">' + mes + '</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '</tr>';
        // Linha 2
        h += '<tr style="border: 1px solid black;">';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '</tr>';
        // Linha 3
        h += '<tr style="border: 1px solid black;">';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '<td style="border: 1px solid black; padding: 6px 4px; font-size: 8pt;">&nbsp;</td>';
        h += '</tr>';
    }
    
    h += '</tbody>';
    h += '</table>';
    return h;
}

/* IMPRESSÃO 4X VERSO BRANCO - FUNÇÃO CORRETA */
function imprimir4VersoBranco() {
    const selecionados = efetivoSU.filter(m => m.imprimir);
    
    let totalPaginas = 1;
    
    if (selecionados.length > 0) {
        totalPaginas = Math.ceil(selecionados.length / 4);
    }
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita pop-ups para esta página.");
        return;
    }

    /* IMPRIMIR 4 CARTÕES FRENTE EM BRANCO - VERSÃO SIMPLIFICADA */

    
    // Função para gerar tabela do verso - com padding reduzido
    const gerarTabelaVerso = (meses) => {
        let h = `<table style="width:100%; height:100%; border-collapse: collapse; border: 1px solid black;">
            <thead>
                <tr>
                    <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; font-size: 6pt;">MÊS</th>
                    <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; font-size: 6pt;">DIA</th>
                    <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; font-size: 6pt;">RUBRICA DO CMT SU</th>
                    <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; font-size: 6pt;">DIA</th>
                    <th style="border: 1px solid black; padding: 2px; background: #f0f0f0; font-size: 6pt;">RUBRICA DO CMT SU</th>
                </tr>
            </thead>
            <tbody>`;
        
        for (let i = 0; i < meses.length; i++) {
            const mes = meses[i];
            // Linha 1
            h += `<tr>
                <td rowspan="3" style="border: 1px solid black; padding: 2px; font-weight: bold; text-align: center; font-size: 7pt; vertical-align: middle; background: #fafafa;">${mes}</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
            </tr>`;
            // Linha 2
            h += `<tr>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
            </tr>`;
            // Linha 3
            h += `<tr>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
                <td style="border: 1px solid black; padding: 2px; font-size: 7pt;">&nbsp;</td>
            </tr>`;
        }
        
        h += `</tbody></table>`;
        return h;
    };
    
    let htmlContent = `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Impressão Verso em Branco</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                
                @page {
                    size: A4 landscape;
                    margin: 0;
                }
                
                body { 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                }
                
                .print-page {
                    width: 297mm;
                    height: 210mm;
                    background: white;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    grid-template-rows: 1fr 1fr;
                    gap: 4mm;
                    padding: 8mm;
                    page-break-after: always;
                    page-break-inside: avoid;
                }
                
                .card-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    border: 1px solid #000;
                    height: 94mm;
                    background: white;
                }
                
                .card-half {
                    padding: 2mm;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    position: relative;
                }
                
                .verso-watermark {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: url('${urlBrasao}');
                    background-repeat: no-repeat;
                    background-position: center;
                    background-size: 45mm 45mm;
                    opacity: 0.05;
                    pointer-events: none;
                    z-index: 1;
                }
                
                .verso-table-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    z-index: 2;
                    background: white;
                }
                
                .verso-half table {
                    width: 100%;
                    height: 100%;
                    border-collapse: collapse;
                    background: white;
                }
                
                .verso-half th,
                .verso-half td {
                    border: 1px solid black;
                }
                
                .verso-half th {
                    font-weight: bold;
                    background-color: #f0f0f0;
                }
                
                .table-side-left {
                    border-right: 1px dashed #bbb;
                }
                
                @media print {
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            </style>
        </head>
        <body>`;
    
    // Gerar páginas
    for (let p = 0; p < totalPaginas; p++) {
        htmlContent += `<div class="print-page">`;
        for (let c = 0; c < 4; c++) {
            htmlContent += `
                <div class="card-container">
                    <div class="card-half table-side-left" style="border-right: 1px dashed #bbb;">
                        <div class="verso-table-container">
                            <div class="verso-watermark"></div>
                            ${gerarTabelaVerso(m1)}
                        </div>
                    </div>
                    <div class="card-half">
                        <div class="verso-table-container">
                            <div class="verso-watermark"></div>
                            ${gerarTabelaVerso(m2)}
                        </div>
                    </div>
                </div>
            `;
        }
        htmlContent += `</div>`;
    }
    
    htmlContent += `</body></html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
}

/* IMPRESSÃO 4X FRENTE BRANCO */
function imprimir4FrenteBranco() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita pop-ups para esta página.");
        return;
    }

    const su = document.getElementById('cfg-su').value;
    const urlBrasao = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Coat_of_arms_of_Brazil_%28variant_B%26W_from_STF%29.svg/250px-Coat_of_arms_of_Brazil_%28variant_B%26W_from_STF%29.svg.png";

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>4x Frente Branco</title><style>
        *{margin:0;padding:0;box-sizing:border-box}@page{size:A4 landscape;margin:0}body{background:white}
        .print-page{width:297mm;height:210mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:4mm;padding:8mm}
        .card-container{display:grid;grid-template-columns:1fr 1fr;border:1px solid #000;height:94mm}
        .card-half{padding:3mm;display:flex;flex-direction:column}
        .blank-side{border-right:1px dashed #bbb;background-image:url('${urlBrasao}');background-repeat:no-repeat;background-position:center;background-size:55mm 55mm;opacity:0.08}
        .content-side{justify-content:flex-start;align-items:center}
        .header{text-align:center;font-weight:bold;font-size:9.5pt;text-transform:uppercase;margin-bottom:4px}
        .brasao-img{width:56px;height:56px;margin:0 auto 4px;display:block}
        .om-section{display:flex;width:100%;justify-content:space-between;font-size:8.5pt;font-weight:bold;margin-bottom:8px}
        .sublinhado-termo{border-bottom:1px solid #000;padding-bottom:1px}
        .visto-section{margin:12px 0;text-align:center;font-size:8pt}
        .visto-line{width:80%;border-bottom:1px solid black;margin:0 auto 3px;height:14px}
        .title{font-weight:bold;font-size:10.5pt;text-align:center;margin-bottom:12px}
        .form-group{width:100%;margin-bottom:5px;font-size:9.5pt;display:flex;align-items:flex-end}
        .form-group label{font-weight:bold;margin-right:4px}
        .form-group input{border:none;border-bottom:1px solid black;width:100%;font-size:10.5pt;text-align:center;background:transparent}
        .inline-group{display:flex;width:100%;justify-content:space-between}
    </style></head><body><div class="print-page">`);

    for (let i = 0; i < 4; i++) {
        printWindow.document.write(`
            <div class="card-container">
                <div class="card-half blank-side"></div>
                <div class="card-half content-side">
                    <div class="header"><img class="brasao-img" src="${urlBrasao}">Ministério da Defesa<br>Exército Brasileiro</div>
                    <div class="om-section"><div class="om-left"><span class="sublinhado-termo">CMS</span></div><div class="om-right"><span class="sublinhado-termo">3ª RM</span><span class="sublinhado-termo">6ª Bda Inf Bld</span><span class="sublinhado-termo">4º RCC</span></div></div>
                    <div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div>
                    <div class="title">REGISTRO DE CORTE DE CABELO</div>
                    <div class="inline-group"><div class="form-group" style="width:65%"><label>Grad.:</label><input type="text" value=""></div><div class="form-group" style="width:32%"><label>N°:</label><input type="text" value=""></div></div>
                    <div class="form-group"><label>NOME:</label><input type="text" value=""></div>
                    <div class="form-group"><label>Subunidade:</label><input type="text" value="${su}"></div>
                </div>
            </div>
        `);
    }

    printWindow.document.write(`</div></body></html>`);
    printWindow.document.close();
    printWindow.print();
}

/* IMPRESSÃO INDIVIDUAL */
function imprimirIndividual() {
    const selecionado = efetivoSU.find(m => m.imprimir);

    if (!selecionado) {
        alert("⚠️ Nenhum militar selecionado! Marque a caixinha 'Imprimir' na ficha auxiliar.");
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita pop-ups para esta página.");
        return;
    }

    const cfgSuElement = document.getElementById('cfg-su');
    const su = cfgSuElement ? cfgSuElement.value : '';

    const cabecalhoHTML = `
        <div class="header">
            <img class="brasao-img" src="${urlBrasao}" alt="Brasão do Exército">
            Ministério da Defesa<br>Exército Brasileiro
        </div>
        <div class="om-section">
            <div class="om-left"><span class="sublinhado-termo">CMS</span></div>
            <div class="om-right">
                <span class="sublinhado-termo">3ª RM</span>
                <span class="sublinhado-termo">6ª Bda Inf Bld</span>
                <span class="sublinhado-termo">4º RCC</span>
            </div>
        </div>`;

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Impressão Individual - ${selecionado.grad} ${selecionado.nome}</title><style>
        *{margin:0;padding:0;box-sizing:border-box}@page{size:A4 landscape;margin:0}body{margin:0;background:white;display:flex;justify-content:center;align-items:center;min-height:100vh}
        .single-print-page{width:148mm;height:105mm;margin:0 auto;background:white;page-break-after:avoid}
        .card-container{width:100%;height:100%;display:grid;grid-template-columns:1fr 1fr;border:1px solid #000}
        .card-half{padding:3mm;display:flex;flex-direction:column}.blank-side{border-right:1px dashed #bbb;background-image:url('${urlBrasao}');background-repeat:no-repeat;background-position:center;background-size:55mm 55mm;opacity:0.08}
        .content-side{justify-content:flex-start;align-items:center}.header{text-align:center;font-weight:bold;font-size:9.5pt;text-transform:uppercase;margin-bottom:4px}
        .brasao-img{width:56px;height:56px;margin:0 auto 4px;display:block}.om-section{display:flex;width:100%;justify-content:space-between;font-size:8.5pt;font-weight:bold;margin-bottom:8px}
        .sublinhado-termo{border-bottom:1px solid #000;padding-bottom:1px}.visto-section{margin:12px 0;text-align:center;font-size:8pt}
        .visto-line{width:60%;border-bottom:1px solid black;margin:0 auto 3px}.title{font-weight:bold;font-size:10.5pt;text-align:center;margin-bottom:12px}
        .form-group{width:100%;margin-bottom:6px;font-size:9.5pt;display:flex;align-items:baseline}.form-group label{font-weight:bold;white-space:nowrap;margin-right:4px}
        .form-group input{border:none;border-bottom:1px solid black;width:100%;font-family:'Times New Roman',Times,serif;font-size:10.5pt;text-align:center;background:transparent}
        .inline-group{display:flex;width:100%;justify-content:space-between}table{width:100%;border-collapse:collapse;border:1px solid black}th,td{border:1px solid black;padding:4px}th{background:#f0f0f0}
        @media print{body{margin:0;padding:0}}
    </style></head><body>
        <div class="single-print-page"><div class="card-container"><div class="card-half blank-side"></div><div class="card-half content-side">${cabecalhoHTML}<div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div><div class="title">REGISTRO DE CORTE DE CABELO</div><div class="inline-group"><div class="form-group" style="width:65%"><label>Grad.:</label><input type="text" value="${escapeHtml(selecionado.grad)}"></div><div class="form-group" style="width:32%"><label>N°:</label><input type="text" value="${escapeHtml(selecionado.numero || '')}"></div></div><div class="form-group"><label>NOME:</label><input type="text" value="${escapeHtml(selecionado.nome)}"></div><div class="form-group"><label>Subunidade:</label><input type="text" value="${escapeHtml(su)}"></div></div></div></div>
        <div class="single-print-page"><div class="card-container"><div class="card-half" style="padding:3mm;border-right:1px dashed #bbb">${gerarTabelaHTML(m1)}</div><div class="card-half" style="padding:3mm">${gerarTabelaHTML(m2)}</div></div></div>
    </body></html>`);

    printWindow.document.close();
    printWindow.print();
}

function imprimirCartaoEmBranco() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita pop-ups para esta página.");
        return;
    }

    const cfgSuElement = document.getElementById('cfg-su');
    const su = cfgSuElement ? cfgSuElement.value : '';

    const cabecalhoHTML = `
        <div class="header">
            <img class="brasao-img" src="${urlBrasao}" alt="Brasão do Exército">
            Ministério da Defesa<br>Exército Brasileiro
        </div>
        <div class="om-section">
            <div class="om-left"><span class="sublinhado-termo">CMS</span></div>
            <div class="om-right">
                <span class="sublinhado-termo">3ª RM</span>
                <span class="sublinhado-termo">6ª Bda Inf Bld</span>
                <span class="sublinhado-termo">4º RCC</span>
            </div>
        </div>`;

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cartão em Branco</title><style>
        *{margin:0;padding:0;box-sizing:border-box}@page{size:A4 landscape;margin:0}body{margin:0;background:white;display:flex;justify-content:center;align-items:center;min-height:100vh}
        .single-print-page{width:148mm;height:105mm;margin:0 auto;background:white;page-break-after:avoid}
        .card-container{width:100%;height:100%;display:grid;grid-template-columns:1fr 1fr;border:1px solid #000}
        .card-half{padding:3mm;display:flex;flex-direction:column}.blank-side{border-right:1px dashed #bbb;background-image:url('${urlBrasao}');background-repeat:no-repeat;background-position:center;background-size:55mm 55mm;opacity:0.08}
        .content-side{justify-content:flex-start;align-items:center}.header{text-align:center;font-weight:bold;font-size:9.5pt;text-transform:uppercase;margin-bottom:4px}
        .brasao-img{width:56px;height:56px;margin:0 auto 4px;display:block}.om-section{display:flex;width:100%;justify-content:space-between;font-size:8.5pt;font-weight:bold;margin-bottom:8px}
        .sublinhado-termo{border-bottom:1px solid #000;padding-bottom:1px}.visto-section{margin:12px 0;text-align:center;font-size:8pt}
        .visto-line{width:60%;border-bottom:1px solid black;margin:0 auto 3px}.title{font-weight:bold;font-size:10.5pt;text-align:center;margin-bottom:12px}
        .form-group{width:100%;margin-bottom:6px;font-size:9.5pt;display:flex;align-items:baseline}.form-group label{font-weight:bold;white-space:nowrap;margin-right:4px}
        .form-group input{border:none;border-bottom:1px solid black;width:100%;font-family:'Times New Roman',Times,serif;font-size:10.5pt;text-align:center;background:transparent}
        .inline-group{display:flex;width:100%;justify-content:space-between}table{width:100%;border-collapse:collapse;border:1px solid black}th,td{border:1px solid black;padding:4px}th{background:#f0f0f0}
        @media print{body{margin:0;padding:0}}
    </style></head><body>
        <div class="single-print-page"><div class="card-container"><div class="card-half blank-side"></div><div class="card-half content-side">${cabecalhoHTML}<div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div><div class="title">REGISTRO DE CORTE DE CABELO</div><div class="inline-group"><div class="form-group" style="width:65%"><label>Grad.:</label><input type="text" value="_______________"></div><div class="form-group" style="width:32%"><label>N°:</label><input type="text" value=""></div></div><div class="form-group"><label>NOME:</label><input type="text" value="_________________________"></div><div class="form-group"><label>Subunidade:</label><input type="text" value="${escapeHtml(su)}"></div></div></div></div>
        <div class="single-print-page"><div class="card-container"><div class="card-half" style="padding:3mm;border-right:1px dashed #bbb">${gerarTabelaHTML(m1)}</div><div class="card-half" style="padding:3mm">${gerarTabelaHTML(m2)}</div></div></div>
    </body></html>`);

    printWindow.document.close();
    printWindow.print();
}

/* IMPRIMIR DADOS CARTÕES RECORTADOS */
function imprimirCartoesAvulsoDadosPDF() {
    const selecionados = efetivoSU.filter(m => m.imprimir);
    if (selecionados.length === 0) {
        alert("⚠️ Nenhum militar selecionado!");
        return;
    }

    const css = `
        *{margin:0;padding:0;box-sizing:border-box}@page{size:148mm 105mm;margin:0}
        body{background:white;font-family:'Times New Roman',Times,serif}
        .page{width:148mm;height:105mm;page-break-after:always;position:relative;background:white}
        .data-area{padding:3mm 6mm;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;height:100%;width:100%}
        .inline-group{display:flex;width:100%;justify-content:space-between;margin-bottom:5px}
        .grad-field,.num-field,.nome-field{font-family:'Times New Roman',Times,serif;font-size:10.5pt;text-align:center;border:none;background:transparent;font-weight:bold}
        .grad-field{text-align:left;width:65%}.num-field{text-align:center;width:32%}.nome-field{width:100%;text-align:center;margin-top:2px}
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Permita pop-ups para esta página.");
        return;
    }

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dados para Cartões</title><style>${css}</style></head><body>`;
    selecionados.forEach(militar => {
        html += `<div class="page"><div class="data-area"><div class="inline-group"><div class="grad-field">${escapeHtml(militar.grad)}</div><div class="num-field">${escapeHtml(militar.numero || '')}</div></div><div class="nome-field">${escapeHtml(militar.nome)}</div></div></div>`;
    });
    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

/* ==================== RENDERIZAÇÃO PRINCIPAL ==================== */
function renderizarSistema() {
    const cfgSu = document.getElementById('cfg-su');
    const su = cfgSu ? cfgSu.value : '';
    salvarDadosGerais();
    atualizarIndicadores();

    const efetivoFiltrado = efetivoSU.filter(m => {
        const correspondeBusca = m.nome.toUpperCase().includes(buscaAtualStr) || m.grad.toUpperCase().includes(buscaAtualStr);
        const statusMilitar = verificarValidade(m.dataCartao);
        return correspondeBusca && (filtroStatusAtual === 'TODOS' || statusMilitar === filtroStatusAtual);
    });

    let efetivoFiltradoParaExibicao = efetivoFiltrado;
    let totalPaginas = 1;

    if (abaAtual === 'ficha') {
        const inicio = (paginaAtual - 1) * registrosPorPagina;
        const fim = inicio + registrosPorPagina;
        efetivoFiltradoParaExibicao = registrosPorPagina === 999999 ? efetivoFiltrado : efetivoFiltrado.slice(inicio, fim);
        totalPaginas = registrosPorPagina === 999999 ? 1 : Math.ceil(efetivoFiltrado.length / registrosPorPagina);
        atualizarPaginacaoBottom(totalPaginas);
    }

    const listaParaImprimir = efetivoSU.filter(m => m.imprimir);
    const totalPaginasPrint = Math.ceil(listaParaImprimir.length / 4);

    const container = document.getElementById('main-container');
    const tabelaContainer = document.getElementById('tabela-container');
    const areaFicha = document.getElementById('area-da-ficha');
    const paginationBottom = document.getElementById('pagination-bottom');

    if (tabelaContainer) tabelaContainer.innerHTML = '';
    if (container) container.innerHTML = '';
    if (areaFicha) areaFicha.style.display = abaAtual === 'ficha' ? 'flex' : 'none';
    if (paginationBottom) paginationBottom.style.display = abaAtual === 'ficha' ? 'flex' : 'none';

    const cabecalhoHTML = `
        <div class="header"><img class="brasao-img" src="${urlBrasao}">Ministério da Defesa<br>Exército Brasileiro</div>
        <div class="om-section"><div class="om-left"><span class="sublinhado-termo">CMS</span></div>
        <div class="om-right"><span class="sublinhado-termo">3ª RM</span><span class="sublinhado-termo">6ª Bda Inf Bld</span><span class="sublinhado-termo">4º RCC</span></div></div>`;

    if (abaAtual === 'ficha') {
        if (efetivoFiltradoParaExibicao.length === 0) {
            if (tabelaContainer) tabelaContainer.innerHTML = `<div style="color:white;text-align:center;margin-top:40px">📭 Nenhum militar encontrado.</div>`;
            return;
        }

        let tableHTML = `<table class="ficha-table" id="ficha-table">
        <thead>
            <tr>
                <th style="width: 5%;">
                    <input type="checkbox" id="checkbox-todos" onchange="marcarDesmarcarTodosPagina(this.checked)" style="transform: scale(1.2); cursor: pointer;">
                </th>
                <th style="width: 5%;">#</th>
                <th style="width: 8%;">P/G</th>
                <th style="width: 8%;">Nº</th>
                <th style="width: 18%;">Nome de Guerra</th>
                <th style="width: 15%;">Data de Emissão</th>
                <th style="width: 12%;">Situação (12M)</th>
                <th style="width: 8%;">Nº Cartões</th>
                <th style="width: 12%;">Ficha</th>
                <th style="width: 9%;">Ações</th>
            </tr>
        </thead>
        <tbody>`;

        const inicioNumeracao = (paginaAtual - 1) * registrosPorPagina;
        let ordem = inicioNumeracao + 1;

        efetivoFiltradoParaExibicao.forEach((militar) => {
            const i = efetivoSU.findIndex(orig => orig.nome === militar.nome && orig.grad === militar.grad);
            const status = verificarValidade(militar.dataCartao);
            let statusClass = 'status-sem-cartao',
                statusTexto = '🛇 SEM CARTÃO';
            if (status === 'VÁLIDO') {
                statusClass = 'status-valido';
                statusTexto = '✓ VÁLIDO';
            } else if (status === 'VENCIDO') {
                statusClass = 'status-vencido';
                statusTexto = '⚠ VENCIDO';
            }

            const checkedAttr = militar.imprimir ? 'checked' : '';
            const labelExibicaoData = militar.dataCartao ? militar.dataCartao.split('-').reverse().join('/') : "NÃO EMITIDO";
            const totalCartoesMilitar = (militar.dataCartao ? 1 : 0) + (militar.historicoOcorrencias ? militar.historicoOcorrencias.length : 0);

            let tooltipTexto = "";
            if (militar.dataCartao) {
                const dataEmissao = new Date(militar.dataCartao);
                const dataValidade = new Date(dataEmissao);
                dataValidade.setMonth(dataValidade.getMonth() + 12);
                const validadeFormatada = dataValidade.toLocaleDateString('pt-BR');
                tooltipTexto = `📅 Válido até: ${validadeFormatada}`;
            } else {
                tooltipTexto = "❌ Nenhum cartão emitido";
            }

            tableHTML += `<tr>
                <td><input type="checkbox" class="checkbox-militar" ${checkedAttr} onchange="toggleImprimir(${i}, this)" data-index="${i}"></td>
                <td><span class="ordem-numero">${ordem}</span></td>
                <td><input type="text" class="editable-cell-input" value="${escapeHtml(militar.grad)}" onchange="editarDadoMilitar(${i}, 'grad', this.value)"></td>
                <td><input type="text" class="editable-cell-input" value="${escapeHtml(militar.numero || '')}" onchange="editarDadoMilitar(${i}, 'numero', this.value)"></td>
                <td><input type="text" class="editable-cell-input" style="text-align:left" value="${escapeHtml(militar.nome)}" onchange="editarDadoMilitar(${i}, 'nome', this.value)"></td>
                <td>
                    <div style="display:flex; flex-direction:column; align-items:center; gap:1px;">
                        <input type="date" class="date-cell-input" value="${militar.dataCartao || ''}" onchange="editarDadoMilitar(${i}, 'dataCartao', this.value)">
                        <span style="font-size:9px; color:#555;">(${labelExibicaoData})</span>
                    </div>
                </td>
                <td>
                    <div>
                        <span class="${statusClass}" title="${tooltipTexto}" style="cursor: help;">${statusTexto}</span>
                    </div>
                </td>
                <td><span class="badge-count">${totalCartoesMilitar}</span></td>
                <td><button class="nav-btn" style="background:#008cba;color:white;padding:4px 8px;font-size:11px;" onclick="abrirHistorico(${i})">📑 Histórico</button></td>
                <td><button class="nav-btn" style="background:#d9534f;color:white;padding:4px 8px;font-size:11px;" onclick="removerMilitar(${i})">Excluir</button></td>
            </tr>`;
            ordem++;
        });
        tableHTML += `</tbody></table>`;
        if (tabelaContainer) tabelaContainer.innerHTML = tableHTML;
        atualizarCheckboxTodos();
    } else if (abaAtual === 'frente') {
        if (listaParaImprimir.length === 0) {
            container.innerHTML = `<div style="color:white;text-align:center;margin-top:40px">⚠️ Nenhum militar marcado para impressão!</div>`;
            return;
        }
        for (let p = 0; p < totalPaginasPrint; p++) {
            let pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';
            for (let c = 0; c < 4; c++) {
                let idx = (p * 4) + c;
                let militar = listaParaImprimir[idx];
                let nomeExibir = militar ? militar.nome : '';
                let gradExibir = militar ? militar.grad : '';
                let numExibir = militar ? (militar.numero || '') : '';

                let cardStyle = militar ? '' : 'style="border: none; background: transparent;"';
                let contentHTML = militar ? `
                        <div class="card-half blank-side"></div>
                        <div class="card-half content-side frente-padding">
                            ${cabecalhoHTML}
                            <div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div>
                            <div class="title">REGISTRO DE CORTE DE CABELO</div>
                            <div class="inline-group">
                                <div class="form-group" style="width: 65%;"><label>Grad.:</label><input type="text" value="${escapeHtml(gradExibir)}"></div>
                                <div class="form-group" style="width: 32%;"><label>N°:</label><input type="text" value="${escapeHtml(numExibir)}"></div>
                            </div>
                            <div class="form-group"><label>NOME:</label><input type="text" value="${escapeHtml(nomeExibir)}"></div>
                            <div class="form-group"><label>Subunidade:</label><input type="text" value="${escapeHtml(su)}"></div>
                        </div>
                    ` : '';
                pageDiv.innerHTML += `<div class="card-container" ${cardStyle}>${contentHTML}</div>`;
            }
            container.appendChild(pageDiv);
        }
    } else if (abaAtual === 'verso') {
        if (listaParaImprimir.length === 0) {
            container.innerHTML = `<div style="color:white;text-align:center;margin-top:40px">⚠️ Nenhum militar marcado para impressão! Marque as caixinhas na coluna "Imprimir" primeiro.</div>`;
            return;
        }
        for (let p = 0; p < totalPaginasPrint; p++) {
            let pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';
            for (let c = 0; c < 4; c++) {
                const idx = (p * 4) + c;
                const militar = listaParaImprimir[idx];
                if (militar) {
                    const contentHTML = `
                        <div class="card-half table-side-left verso-half" style="border-right: 1px dashed #bbb; padding: 3mm;">
                            <div class="verso-watermark"></div>
                            ${gerarTabelaHTML(m1)}
                        </div>
                        <div class="card-half verso-half" style="padding: 3mm;">
                            <div class="verso-watermark"></div>
                            ${gerarTabelaHTML(m2)}
                        </div>
                    `;
                    pageDiv.innerHTML += `<div class="card-container">${contentHTML}</div>`;
                } else {
                    pageDiv.innerHTML += `<div class="card-container" style="border: none; background: transparent;"></div>`;
                }
            }
            container.appendChild(pageDiv);
        }
    } else if (abaAtual === 'dobra') {
        if (listaParaImprimir.length === 0) {
            container.innerHTML = `<div style="color:white;text-align:center;margin-top:40px">⚠️ Nenhum militar marcado para impressão!</div>`;
            return;
        }
        listaParaImprimir.forEach((militar) => {
            let pageDiv = document.createElement('div');
            pageDiv.className = 'print-page';
            pageDiv.style.cssText = 'display:flex;justify-content:center;align-items:center;background:#e0e0e0';
            pageDiv.innerHTML = `<div style="width:148mm;height:210mm;background:white;box-shadow:0 5px 15px rgba(0,0,0,0.3);border:1px solid #aaa;display:flex;flex-direction:column">
                <div style="display:flex;height:105mm;border-bottom:2px dashed #888"><div class="card-half blank-side" style="height:105mm;width:74mm;border-right:1px dashed #bbb"></div>
                <div class="card-half content-side frente-padding" style="height:105mm;width:74mm;padding:3mm">${cabecalhoHTML}<div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div><div class="title">REGISTRO DE CORTE DE CABELO</div><div class="inline-group"><div class="form-group" style="width:65%"><label>Grad.:</label><input type="text" value="${escapeHtml(militar.grad)}"></div><div class="form-group" style="width:32%"><label>N°:</label><input type="text" value="${escapeHtml(militar.numero || '')}"></div></div><div class="form-group"><label>NOME:</label><input type="text" value="${escapeHtml(militar.nome)}"></div><div class="form-group"><label>Subunidade:</label><input type="text" value="${escapeHtml(su)}"></div></div></div>
                <div style="display:flex;height:105mm"><div class="card-half table-side-left verso-half" style="border-right:1px dashed #bbb;padding:3mm;height:105mm;width:74mm"><div class="verso-watermark"></div>${gerarTabelaHTML(m1)}</div>
                <div class="card-half verso-half" style="padding:3mm;height:105mm;width:74mm"><div class="verso-watermark"></div>${gerarTabelaHTML(m2)}</div></div></div>`;
            container.appendChild(pageDiv);
        });
    }
}

/* ==================== CHECKBOX TODOS ==================== */
function marcarDesmarcarTodosPagina(marcar) {
    const checkboxes = document.querySelectorAll('.checkbox-militar');
    let modificados = 0;

    checkboxes.forEach((checkbox) => {
        const index = parseInt(checkbox.getAttribute('data-index'));
        if (index !== undefined && efetivoSU[index] && efetivoSU[index].imprimir !== marcar) {
            efetivoSU[index].imprimir = marcar;
            checkbox.checked = marcar;
            modificados++;
        }
    });

    if (modificados > 0) {
        salvarBancoDados();
        renderizarSistema();
    }
}

function atualizarCheckboxTodos() {
    const checkboxTodos = document.getElementById('checkbox-todos');
    if (!checkboxTodos) return;

    const checkboxes = document.querySelectorAll('.checkbox-militar');
    const total = checkboxes.length;
    const marcados = Array.from(checkboxes).filter(cb => cb.checked).length;

    if (total === 0) {
        checkboxTodos.checked = false;
        checkboxTodos.indeterminate = false;
    } else if (marcados === total) {
        checkboxTodos.checked = true;
        checkboxTodos.indeterminate = false;
    } else if (marcados > 0) {
        checkboxTodos.checked = false;
        checkboxTodos.indeterminate = true;
    } else {
        checkboxTodos.checked = false;
        checkboxTodos.indeterminate = false;
    }
}

/* Inicialização */
document.addEventListener('DOMContentLoaded', function() {
    if (efetivoSU.length === 0) {
        efetivoSU = [{
                grad: "CB",
                nome: "SILVA",
                numero: "",
                dataCartao: "",
                imprimir: false,
                qtdCartoes: 0,
                historicoOcorrencias: []
            },
            {
                grad: "SD EP",
                nome: "SANTOS",
                numero: "",
                dataCartao: "",
                imprimir: false,
                qtdCartoes: 0,
                historicoOcorrencias: []
            },
            {
                grad: "SD EV",
                nome: "OLIVEIRA",
                numero: "",
                dataCartao: "",
                imprimir: false,
                qtdCartoes: 0,
                historicoOcorrencias: []
            }
        ];
        salvarBancoDados();
    }
    ordenarEfetivo();
    renderizarSistema();
});

window.imprimirDadosCartoesRecortados = imprimirCartoesAvulsoDadosPDF;
window.imprimir4FrenteBranco = imprimir4FrenteBranco;
window.imprimir4VersoBranco = imprimir4VersoBranco;