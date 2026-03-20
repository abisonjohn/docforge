module.exports = (data) => {

    function numberToWords(num) {
        const belowTwenty = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const aboveThousand = ['Thousand', 'Million', 'Billion'];

        if (num < 20) return belowTwenty[num];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + belowTwenty[num % 10] : '');

        if (num < 1000) return belowTwenty[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');

        for (let i = 0, value = 1000; i < aboveThousand.length; i++, value *= 1000) {
            if (num < value * 1000) return numberToWords(Math.floor(num / value)) + ' ' + aboveThousand[i] + (num % value ? ' ' + numberToWords(num % value) : '');
        }
    }

    function convertToWords(amount, currency) {
        const currencyNames = {
            'USD': { singular: 'US Dollar', plural: 'US Dollars', centSingular: 'Cent', centPlural: 'Cents' },
            'EUR': { singular: 'Euro', plural: 'Euros', centSingular: 'Cent', centPlural: 'Cents' },
            'INR': { singular: 'Rupee', plural: 'Rupees', centSingular: 'Paisa', centPlural: 'Paisa' },
            'JPY': { singular: 'Yen', plural: 'Yen', centSingular: '', centPlural: '' }, // Yen doesn't have a smaller denomination typically
            'RUB': { singular: 'Ruble', plural: 'Rubles', centSingular: 'Kopek', centPlural: 'Kopeks' },
            'GBP': { singular: 'Pound', plural: 'Pounds', centSingular: 'Penny', centPlural: 'Pence' },
            'CHF': { singular: 'Franc', plural: 'Francs', centSingular: 'Rappen', centPlural: 'Rappen' },
            'CAD': { singular: 'Canadian Dollar', plural: 'Canadian Dollars', centSingular: 'Cent', centPlural: 'Cents' }
        };

        // Fallback to USD if currency is not defined
        const currencyName = currencyNames[currency] || currencyNames['USD'];

        let parts = amount.toFixed(2).split('.');
        let integerPart = parseInt(parts[0], 10);
        let decimalPart = parseInt(parts[1], 10);

        let integerInWords = numberToWords(integerPart);
        let decimalInWords = decimalPart > 0 ? ' and ' + numberToWords(decimalPart) + ' ' + (decimalPart === 1 ? currencyName.centSingular : currencyName.centPlural) : '';

        // Format the result to have currency first
        let result = (integerPart === 1 ? currencyName.singular : currencyName.plural) + ' ' + integerInWords + decimalInWords;

        // Capitalize the first letter of the result
        return result.charAt(0).toUpperCase() + result.slice(1).trim();
    }

    var subTotalAmount = 0;
    var totalAmount = 0;
    var igst = 0;
    var cgst = 0;
    var sgst = 0;
    var borderWidth = 0.5;
    var borderColor = 'black';
    var customLayout = {
        hLineWidth: function (i, node) {
            return borderWidth; // No top border
        },
        vLineWidth: function (i, node) {
            return borderWidth;
        },
        hLineColor: function (i, node) {
            return borderColor;
        },
        vLineColor: function (i, node) {
            return borderColor;
        }
    };

    var isIntrastate = false;
    var isInterstate = false;

    // Determine intra/interstate based on GST and SEZ
    if (data.bill_to.gst && data.bill_to.gst.length >= 2) {
        const gstState = data.bill_to.gst.substring(0, 2);
        isIntrastate = gstState === '32';
        isInterstate = gstState !== '32';
    } else {
        isIntrastate = false;
        isInterstate = false;
    }

    var tos = `1. Billing should be on actual measurements/Qty supplied.
2. In case of Import items following items are mandatory like Commercial Invoice, Bill of Lading (or) Air way bill, Certificate of Orgin, Packing list & any other documents required by the legal authorities in India.
3. Consignment/Material received in damaged conditions (or) not meeting the agreed specifications will be rejected & mail information will be sent to the supplier. Supplier should arrange to pick up the same on their own expense.
4. Delivery Schedule will be as per the P.O delivery date mentioned on the Purchase order.
5. For any other special conditions/ information's - Please see the comments column for more details.`;

    const itemTableItem = (items) => {
        let itemRow = [];
        if (isIntrastate) {
            items.forEach((it, index) => {
                if (index == 1) {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'left', margin: [0, 5, 0, 5]
                    });
                } else if (index == 8) {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'right', margin: [0, 5, 0, 5]
                    });
                } else {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'center', margin: [0, 5, 0, 5]
                    });
                }
            });
        } else if (isInterstate) {
            items.forEach((it, index) => {
                if (index == 1) {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'left', margin: [0, 5, 0, 5]
                    });
                } else if (index == 7) {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'right', margin: [0, 5, 0, 5]
                    });
                } else {
                    itemRow.push({
                        text: it, fontSize: 8, alignment: 'center', margin: [0, 5, 0, 5]
                    });
                }
            });
        } else {
            items.forEach((it, index) => {
                let align;
                if (index === 1) {
                    align = 'left';
                } else if ([5, 6, 7].includes(index)) {
                    align = 'right';
                } else {
                    align = 'center';
                }
                itemRow.push({
                    text: it, fontSize: 8, alignment: align, margin: [0, 5, 0, 5]
                });
            });
        }
        return itemRow;
    }

    const itemTableHeader = (text) => {
        return {
            text: text,
            bold: true,
            fontSize: 8, alignment: 'center',
            alignment: 'center'
        }
    }

    let currency = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: data.CURRENCY
    });

    let columnWidths;
    if (isIntrastate) {
        columnWidths = ['4%', '29%', '9%', '11%', '8%', '5%', '8%', '7%', '7%', '12%'];
        // columnWidths = ['10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%', '10%'];
    } else if (isInterstate) {
        columnWidths = ['5%', '35%', '9%', '11%', '8%', '5%', '8%', '7%', '12%'];
    } else {
        columnWidths = ['5%', '30%', '10%', '10%', '10%', '10%', '10%', '15%'];
    }

    const items = (items) => {
        let rows = [];

        if (isIntrastate) {
            rows = [[itemTableHeader('SL No'), itemTableHeader('Item'), itemTableHeader('HSN/SAC'), itemTableHeader('Item Code'), itemTableHeader('Quantity'), itemTableHeader('UOM'), itemTableHeader('Rate'), itemTableHeader('SGST'), itemTableHeader('CGST'), itemTableHeader('Taxable Value')]];
        } else if (isInterstate) {
            rows = [[itemTableHeader('SL No'), itemTableHeader('Item'), itemTableHeader('HSN/SAC'), itemTableHeader('Item Code'), itemTableHeader('Quantity'), itemTableHeader('UOM'), itemTableHeader('Rate'), itemTableHeader('IGST'), itemTableHeader('Taxable Value')]];
        } else {
            rows = [[itemTableHeader('SL No'), itemTableHeader('Item'), itemTableHeader('HSN/SAC'), itemTableHeader('Item Code'), itemTableHeader('Quantity'), itemTableHeader('UOM'), itemTableHeader('Rate'), itemTableHeader('Total Amount')]];
        }

        let totalQty = 0;
        items.forEach((item, i) => {
            subTotalAmount += item.taxable_value;
            totalQty += item.qty != null ? item.qty : 0;
            if (isIntrastate) {
                rows.push(
                    itemTableItem([i + 1, item.description != null ? item.description : '', item.hsn_code != null ? item.hsn_code : '', item.item_code != null ? item.item_code : '', `${item.qty != null ? item.qty : 0}\n${item.item_specification != null ? '(' + item.item_specification + ')' : ''}`, item.uom, currency.format(item.dd_sell_price), `${item.sgst != null ? item.sgst : 0}`, `${item.cgst != null ? item.cgst : 0}`, currency.format(item.taxable_value)])
                );
            } else if (isInterstate) {
                rows.push(
                    itemTableItem([i + 1, item.description != null ? item.description : '', item.hsn_code != null ? item.hsn_code : '', item.item_code != null ? item.item_code : '', `${item.qty != null ? item.qty : 0}\n${item.item_specification != null ? '(' + item.item_specification + ')' : ''}`, item.uom, currency.format(item.dd_sell_price), `${item.igst != null ? item.igst : 0}`, currency.format(item.taxable_value)])
                );
            } else {
                rows.push(
                    itemTableItem([i + 1, item.description != null ? item.description : '', item.hsn_code != null ? item.hsn_code : '', item.item_code != null ? item.item_code : '', `${item.qty != null ? item.qty : 0}\n${item.item_specification != null ? '(' + item.item_specification + ')' : ''}`, item.uom, currency.format(item.dd_sell_price), currency.format(item.grand_total)])
                );
            }
        })

        items.forEach(item => {
            igst += item.igst_value ? item.igst_value : 0;
            cgst += item.cgst_value ? item.cgst_value : 0;
            sgst += item.sgst_value ? item.sgst_value : 0;
        });

        if (isIntrastate) {
            rows.push([{ text: '', colSpan: 8, rowSpan: 4 }, '', '', '', '', '', '', '', { text: 'Subtotal', alignment: 'right' }, { text: currency.format(subTotalAmount), alignment: 'right' }]);
            rows.push(['', '', '', '', '', '', '', '', { text: `CGST`, alignment: 'right' }, { text: currency.format(cgst), alignment: 'right' }]);
            rows.push(['', '', '', '', '', '', '', '', { text: `SGST`, alignment: 'right' }, { text: currency.format(sgst), alignment: 'right' }]);
            totalAmount = (subTotalAmount + sgst + cgst);
            rows.push(['', '', '', '', '', '', '', '', { text: 'Total', alignment: 'right' }, { text: currency.format(totalAmount), alignment: 'right' }]);
        } else if (isInterstate) {
            rows.push([{ text: '', colSpan: 7, rowSpan: 3 }, '', '', '', '', '', '', { text: 'Subtotal', alignment: 'right' }, { text: currency.format(subTotalAmount), alignment: 'right' }]);
            rows.push(['', '', '', '', '', '', '', { text: 'IGST', alignment: 'right' }, { text: currency.format(igst), alignment: 'right' }]);
            totalAmount = subTotalAmount + igst;
            rows.push(['', '', '', '', '', '', '', { text: 'Total', alignment: 'right' }, { text: currency.format(totalAmount), bold: true, alignment: 'right' }]);
        } else {
            totalAmount = subTotalAmount
            rows.push([{ text: '', colSpan: 6 }, '', '', '', '', '', { text: 'Total', alignment: 'right' }, { text: currency.format(totalAmount), bold: true, alignment: 'right' }]);
        }
        // rows.push(['', '', '', '', '', '', '', '', '']);

        return rows;
    }

    return {
        defaultStyle: {
            font: 'IBMPlexSans', // Use your custom font
            fontSize: 8,       // Set the default font size
            bold: false,        // Set text to be not bold by default
            italics: false,     // Disable italics by default
            alignment: 'justify' // Justify text alignment
        },
        pageMargins: [20, 20, 20, 20],
        content: [
            {
                text: 'SALE ORDER ACKNOWLEDGEMENT', alignment: 'center', bold: true, fontSize: 10
            },
            {
                table: {
                    headerRows: 0,
                    widths: [30, '*', '*', 130, 130],
                    body: [
                        [{ image: 'data:image/png;base64,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', border: [true, true, false, true], width: 31, height: 50, rowSpan: 7 },
                        { text: ['BIOINGREDIA NATURAL PVT LTD', { text: '\n23/1186, 3RD FLOOR, POCUDYIL PLAZA\n  PADAMUGAL, ERNAKULAM - 682030, KERALA, INDIA\nGSTIN/UIN: 32AAGCB1593G1ZW\nState Name: Kerala, Code: 32\nCIN: U74140KL2015PTC037811\nFSSAL No: 10018041001390\nUSFDA: 14300379046\nE-Mail: sales@bioingredia.com\nwww.bioingredia.com', bold: false, lineHeight: 0.9 }], border: [false, true, true, true], bold: true, fontSize: 8, rowSpan: 7, colSpan: 2 }, {}, { text: ['Sale Order No: ', { text: data.DOC_PROV_NO, bold: true }], fontSize: 8 }, { text: ['Sale Order Date: ', { text: data.DOC_PROV_DATE, bold: true }], fontSize: 8 }],
                        [{}, {}, {}, { text: [{ text: `PO Number: ` }, { text: data.PURCHASE_ORDER, bold: true }], fontSize: 8 }, { text: [{ text: `PO Date: ` }, { text: data.PURCHASE_ORDER_DATE, bold: true }], fontSize: 8 }],
                        [{}, {}, {}, { text: [{ text: 'Currency:' }, { text: data.CURRENCY, bold: true }], fontSize: 8, colSpan: 2 }, {}],
                        [{}, {}, {}, { text: [{ text: 'Payment Terms: ' }, { text: data.PAYMENT_TERMS, bold: true }], fontSize: 8, colSpan: 2 }, {}],
                        [{}, {}, {}, { text: [{ text: `Shipment Mode: ` }, { text: data.SHIPMENT_TYPE, bold: true }], fontSize: 8, colSpan: 2 }, {}],
                        [{}, {}, {}, { text: [{ text: `Incoterms: ` }, { text: data.INCOTERMS, bold: true }], fontSize: 8, colSpan: 2 }, {}],
                        [{}, {}, {}, { text: [{ text: `Dispatch Date: ` }, { text: data.DELIVERY_DATE, bold: true }], fontSize: 8 }, { text: [{ text: `Destination: ` }, { text: data.CITY, bold: true }], fontSize: 8 }]
                    ]
                },
                layout: customLayout
            },
            //Shipping Address
            {
                table: {
                    headerRows: 0,
                    widths: ['50%', '50%'],
                    body: [
                        [{
                            text: ['Bill To:\n', { text: data.bill_to.location_name, bold: true }, {
                                text: `${data.bill_to.address1 ? '\n' + data.bill_to.address1 : ''}` +
                                    `${data.bill_to.address2 ? '\n' + data.bill_to.address2 : ''}` +
                                    `${data.bill_to.city ? '\n' + data.bill_to.city : ''}` +
                                    `${data.bill_to.state ? ',' + data.bill_to.state : ''}` +
                                    `${data.bill_to.country ? '\n' + data.bill_to.country : ''}` +
                                    `${data.bill_to.postal_code ? ' - ' + data.bill_to.postal_code : ''}` +
                                    `${data.bill_to.gst ? '\nGSTIN: ' + data.bill_to.gst : ''}`
                            }], fontSize: 8
                        }, {
                            text: ['Ship To:\n', { text: data.ship_to.location_name, bold: true }, {
                                text: `${data.ship_to.address1 ? '\n' + data.ship_to.address1 : ''}` +
                                    `${data.ship_to.address2 ? '\n' + data.ship_to.address2 : ''}` +
                                    `${data.ship_to.city ? '\n' + data.ship_to.city : ''}` +
                                    `${data.ship_to.state ? ',' + data.ship_to.state : ''}` +
                                    `${data.ship_to.country ? '\n' + data.ship_to.country : ''}` +
                                    `${data.ship_to.postal_code ? ' - ' + data.ship_to.postal_code : ''}` +
                                    `${data.ship_to.gst ? '\nGSTIN: ' + data.ship_to.gst : ''}`
                            }], fontSize: 8
                        }],
                    ]
                },
                layout: customLayout
            },
            //PO Items
            {
                table: {
                    headerRows: 1,
                    widths: columnWidths,
                    body: items(data.items)
                },
                layout: customLayout
            },
            //Footer
            {
                table: {
                    headerRows: 0,
                    widths: ['*', 30],
                    body: [
                        [{ text: ['Amount Chargeable (in words) \n', { text: convertToWords(totalAmount, data.CURRENCY), bold: true, fontSize: 8 }], border: [true, true, false, true], fontSize: 8 }, { text: 'E. & O.E', alignment: 'right', fontSize: 6, border: [false, true, true, true] }]
                    ],
                },
                layout: customLayout
            },
            {
                table: {
                    headerRows: 0,
                    widths: ['*', '*'],
                    body: [
                        [{ text: 'Sales Manager', bold: true }, { text: data.default_sales_rep.name }],
                        [{ text: 'Contact Number', bold: true }, { text: data.default_sales_rep.phone }],
                        [{ text: 'E-Mail', bold: true }, { text: data.default_sales_rep.email }],
                        [{ text: 'Sales Support', bold: true }, { text: 'salessupport@bioingredia.com' }]
                    ],
                },
                layout: customLayout
            },
            /*             {
                            table: {
                                headerRows: 0,
                                widths: ['*'],
                                body: [
                                    [{ text: [{ text: `Remarks:\n`, decoration: 'underline', bold: true }, { text: data.REMARKS }], fontSize: 8, }],
                                ],
                            },
                            layout: customLayout
                        }, */
            {
                text: `This sales order is subject to our standard terms and conditions.
Please review the order details carefully and inform us within 24 hours in case of any discrepancy.
Once confirmed, the order will be processed as per the agreed terms.
For any clarification, please contact your sales manager.`,
                fontSize: 8,
                alignment: 'center',
                margin: [0, 10, 0, 0]
            }
        ],
    };
}