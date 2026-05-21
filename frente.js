// frente.js - Impressão de 4 cartões frente em branco com marcas de corte

function imprimir4FrenteBranco() {
    console.log("=== imprimir4FrenteBranco chamada ===");
    
    var printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Por favor, permita pop-ups para esta página.");
        return;
    }

    var su = document.getElementById('cfg-su').value;
    var urlBrasao = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Bras%C3%A3o_do_Ex%C3%A9rcito_Brasileiro.svg/200px-Bras%C3%A3o_do_Ex%C3%A9rcito_Brasileiro.svg.png";

    var css = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; background: white; font-family: 'Times New Roman', Times, serif; }
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
            position: relative;
        }
        .card-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 1px solid #000;
            height: 94mm;
            background: white;
            position: relative;
        }
        .card-half {
            padding: 3mm;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .blank-side {
            border-right: 1px dashed #bbb;
            background-image: url('${urlBrasao}');
            background-repeat: no-repeat;
            background-position: center;
            background-size: 55mm 55mm;
            opacity: 0.08;
        }
        .content-side {
            align-items: center;
            background-color: #ffffff;
        }
        .frente-padding {
            padding: 3mm 6mm;
            justify-content: flex-start;
        }
        .header {
            text-align: center;
            font-weight: bold;
            font-size: 9.5pt;
            text-transform: uppercase;
            line-height: 1.2;
            margin-bottom: 2px;
            width: 100%;
        }
        .brasao-img {
            width: 56px;
            height: 56px;
            margin: 0 auto 4px auto;
            display: block;
            object-fit: contain;
        }
        .om-section {
            display: flex;
            width: 100%;
            justify-content: space-between;
            font-size: 8.5pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
            align-items: flex-start;
        }
        .sublinhado-termo {
            display: inline-block;
            border-bottom: 1px solid #000;
            padding-bottom: 1px;
            margin-bottom: 4px;
        }
        .om-left { text-align: left; }
        .om-right {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
        }
        .om-right span {
            display: block;
            width: 100%;
            text-align: right;
        }
        .visto-section {
            width: 100%;
            margin-top: 15px;
            margin-bottom: 14px;
            text-align: center;
            font-size: 8pt;
        }
        .visto-line {
            width: 80%;
            border-bottom: 1px solid black;
            margin: 0 auto 3px auto;
            height: 14px;
        }
        .title {
            font-weight: bold;
            font-size: 10.5pt;
            text-align: center;
            margin-bottom: 12px;
            letter-spacing: 0.5px;
        }
        .form-group {
            width: 100%;
            margin-bottom: 5px;
            font-size: 9.5pt;
            display: flex;
            align-items: flex-end;
        }
        .form-group label {
            font-weight: bold;
            white-space: nowrap;
            margin-right: 4px;
        }
        .form-group input {
            border: none;
            border-bottom: 1px solid black;
            width: 100%;
            padding: 0;
            margin: 0;
            font-family: 'Times New Roman', Times, serif;
            font-size: 10.5pt;
            text-align: center;
            background: transparent;
        }
        .inline-group {
            display: flex;
            width: 100%;
            justify-content: space-between;
        }
        .crop-mark {
            position: absolute;
            width: 10px;
            height: 10px;
            background: transparent;
            z-index: 100;
        }
        .crop-mark-top-left { top: -1px; left: -1px; border-top: 1px solid black; border-left: 1px solid black; }
        .crop-mark-top-right { top: -1px; right: -1px; border-top: 1px solid black; border-right: 1px solid black; }
        .crop-mark-bottom-left { bottom: -1px; left: -1px; border-bottom: 1px solid black; border-left: 1px solid black; }
        .crop-mark-bottom-right { bottom: -1px; right: -1px; border-bottom: 1px solid black; border-right: 1px solid black; }
    `;

    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Frente Branco com Marcas de Corte</title><style>' + css + '</style></head><body>';

    for (let p = 0; p < 1; p++) {
        html += '<div class="print-page">';
        for (let i = 0; i < 4; i++) {
            html += `
                <div class="card-container" style="position: relative;">
                    <div class="crop-mark crop-mark-top-left"></div>
                    <div class="crop-mark crop-mark-top-right"></div>
                    <div class="crop-mark crop-mark-bottom-left"></div>
                    <div class="crop-mark crop-mark-bottom-right"></div>
                    
                    <div class="card-half blank-side"></div>
                    <div class="card-half content-side frente-padding">
                        <div class="header">
                            <img class="brasao-img" src="${urlBrasao}">
                            Ministério da Defesa<br>Exército Brasileiro
                        </div>
                        <div class="om-section">
                            <div class="om-left"><span class="sublinhado-termo">CMS</span></div>
                            <div class="om-right">
                                <span class="sublinhado-termo">3ª RM</span>
                                <span class="sublinhado-termo">6ª Bda Inf Bld</span>
                                <span class="sublinhado-termo">4º RCC</span>
                            </div>
                        </div>
                        <div class="visto-section"><div class="visto-line"></div><strong>VISTO: SUB-CMT</strong></div>
                        <div class="title">REGISTRO DE CORTE DE CABELO</div>
                        <div class="inline-group">
                            <div class="form-group" style="width: 65%;"><label>Grad.:</label><input type="text" value=""></div>
                            <div class="form-group" style="width: 32%;"><label>N°:</label><input type="text" value=""></div>
                        </div>
                        <div class="form-group"><label>NOME:</label><input type="text" value=""></div>
                        <div class="form-group"><label>Subunidade:</label><input type="text" value="${su}"></div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
    }
    html += '</body></html>';

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

// Garantir que a função esteja no escopo global
window.imprimir4FrenteBranco = imprimir4FrenteBranco;

console.log("frente.js carregado - função imprimir4FrenteBranco disponível");