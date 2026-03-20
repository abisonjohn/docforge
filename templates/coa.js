const axios = require('axios');

async function getImageBase64(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64 = Buffer.from(response.data, 'binary').toString('base64');
    return `data:image/png;base64,${base64}`;
}

module.exports = async (data) => {

    const approve_sign = await getImageBase64(data.APPROVE_SIGN ? data.APPROVE_SIGN : 'https://placehold.co/1x1/png');
    const prepared_sign = await getImageBase64(data.PREPARED_SIGN ? data.PREPARED_SIGN : 'https://placehold.co/1x1/png');
    const bio_logo = await getImageBase64('https://gfdb4d39cfc47c6-bioprod.adb.ap-mumbai-1.oraclecloudapps.com/ords/r/bio/200/files/static/v545/bioingredia_logo.png');
    const footer = await getImageBase64('https://gfdb4d39cfc47c6-bioprod.adb.ap-mumbai-1.oraclecloudapps.com/ords/r/bio/200/files/static/v545/bio_footer.png');

    var borderWidth = 0.5;
    var borderColor = 'grey';
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

    function sortQAData(data) {
        const groupPriority = {
            "Organoleptic Characteristics": 1,
            "Physio - Chemical Specifications": 2,
            "Residual Solvent": 3,
            "Microbiology": 4,
            "Mycotoxins": 5,
            "Heavy metals": 6,
            "Storage": 7,
            "Shelf Life": 8,
            "Certifications": 9,
            "GMO Statement": 10,
            "Handling": 11,
            "ETO Statement": 12,
            "Intented Use": 13,
            "Labelling": 14,
            "Statement": 15,
            "Documentation": 16,
            "Additives": 17,
            "Packing": 18,
            "Spice Equivalent": 19
        };

        // Group by QA_GROUP
        const groupedData = data.reduce((acc, item) => {
            if (!acc[item.QA_GROUP]) {
                acc[item.QA_GROUP] = [];
            }
            acc[item.QA_GROUP].push(item);
            return acc;
        }, {});

        // Sort each group by SRL_NO
        for (const group in groupedData) {
            groupedData[group].sort((a, b) => (a.SRL_NO || 0) - (b.SRL_NO || 0));
        }

        // Create final ordered array by QA_GROUP priority
        const sortedData = Object.keys(groupedData)
            .sort((a, b) => (groupPriority[a] || 99) - (groupPriority[b] || 99))
            .map(group => ({
                QA_GROUP: group,
                items: groupedData[group].map(({ QA_PARAMETERS, QA_SPECIFICATION, QA_REFERENCE, QA_TEST_RESULT, SRL_NO }) => ({
                    QA_PARAMETERS,
                    QA_SPECIFICATION,
                    QA_REFERENCE,
                    QA_TEST_RESULT,
                    QA_GROUP: group,
                    SRL_NO
                }))
            }));

        return sortedData;
    }

            // TODO Copy from here
            console.log(data);

            const itemTableHeader = (text) => {
                return {
                    text: text,
                    bold: true,
                    fontSize: 8.5,
                    color: '#222',
                    alignment: 'center',
                }
            }
            const items = (DATA) => {
                let items = sortQAData(DATA);
                let rows = [
                    [itemTableHeader('SL No'), itemTableHeader('Analysis'), itemTableHeader('Specification'), itemTableHeader('Results'), itemTableHeader('Reference')]
                ];

                items.forEach((item, i) => {
                    if (item.items[0].QA_REFERENCE == null) {
                        rows.push(
                            [
                                {
                                    text: i + 1,
                                    fontSize: 8.5,
                                    alignment: 'center',
                                },
                                {
                                    text: item.QA_GROUP,
                                    fontSize: 8.5,
                                    bold: true,
                                    alignment: 'left',
                                }, {
                                    text: item.items[0].QA_SPECIFICATION,
                                    fontSize: 8.5,
                                    bold: false,
                                    alignment: 'left',
                                    colSpan: 3,
                                }, {}, {}
                            ]
                        );
                    } else {
                        rows.push(
                            [
                                {
                                    text: i + 1,
                                    fontSize: 8.5,
                                    alignment: 'center',
                                },
                                {
                                    text: item.QA_GROUP,
                                    fontSize: 8.5,
                                    bold: true,
                                    alignment: 'left',
                                    colSpan: 4,
                                }, {}, {}, {}
                            ]
                        );
                        item.items.forEach(details => {
                            rows.push(
                                [
                                    { text: '' },
                                    {
                                        text: details.QA_PARAMETERS,
                                        fontSize: 8.5,
                                        alignment: 'left',
                                    }, {
                                        text: details.QA_SPECIFICATION,
                                        fontSize: 8.5,
                                        alignment: 'left',
                                    }, {
                                        text: details.QA_TEST_RESULT,
                                        fontSize: 8.5,
                                        alignment: 'left',
                                    }, {
                                        text: details.QA_REFERENCE,
                                        fontSize: 8.5,
                                        alignment: 'left',
                                    }
                                ]
                            );
                        });
                    }
                })

                return rows;
            }
            return {
                defaultStyle: {
                    font: 'IBMPlexSans', // Use your custom font
                    fontSize: 8, // Set the default font size
                    bold: false, // Set text to be not bold by default
                    italics: false, // Disable italics by default
                    alignment: 'justify' // Justify text alignment
                },
                pageMargins: [20, 170, 20, 90],
                watermark: data.STATUS == 'A' ? null : {
                    text: 'DRAFT', // The watermark text
                    color: 'grey',        // Color of the watermark
                    opacity: 0.2,         // Transparency level (0 = invisible, 1 = solid)
                    bold: true,           // Make the watermark bold
                    italics: false,       // Italics (if needed)
                    fontSize: 140,         // Font size of the watermark text
                    angle: -45             // Rotation angle of the text in degrees
                },
                images: {
                    approve_sign: approve_sign,
                    prepared_sign: prepared_sign,
                    bio_logo: bio_logo,
                    footer: footer
                },
                header: function (currentPage, pageCount) {
                    return {
                        stack: [{
                            margin: [20, 20, 20, 0],
                            table: {
                                headerRows: 0,
                                widths: ['*', '*'],
                                body: [
                                    [{
                                        image: 'bio_logo',
                                        width: 150,
                                        height: 44,
                                        alignment: "left",
                                        border: [false, false, false, false]
                                    }]
                                ]
                            }
                        },
                        {
                            text: 'CERTIFICATE OF ANALYSIS',
                            alignment: 'center',
                            bold: true,
                            fontSize: 16,
                            margin: [20, 5, 20, 0],
                        },
                        {
                            margin: [20, 10, 20, 0],
                            table: {
                                headerRows: 0,
                                widths: ['14%', '1%', '50%', '14%', '1%', '20%'],
                                body: [
                                    [{
                                        text: 'Product Name',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: data.IM_DESC,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: 'Lot No',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: data.BATCH_NO,
                                        fontSize: 8.5
                                    }
                                    ],
                                    [{
                                        text: 'Product Code',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: data.IM_ITEM_CODE,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: 'Invoice Quantity',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: `${data.BATCH_QTY} ${data.UOM}`,
                                        fontSize: 8.5
                                    }
                                    ],
                                    [
                                        {
                                            text: 'Invoice No',
                                            bold: true,
                                            fontSize: 8.5
                                        },
                                        {
                                            text: ':',
                                            fontSize: 8.5
                                        },
                                        {
                                            text: data.TALLY_INVOICE_DETAILS,
                                            fontSize: 8.5
                                        },
                                        {
                                            text: 'Mfg Date',
                                            bold: true,
                                            fontSize: 8.5
                                        },
                                        {
                                            text: ':',
                                            fontSize: 8.5
                                        },
                                        {
                                            text: data.MAN_DATE,
                                            fontSize: 8.5
                                        }
                                    ],
                                    [{
                                        text: 'Invoice Date',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: data.DOC_DATE,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: 'Best Before',
                                        bold: true,
                                        fontSize: 8.5
                                    },
                                    {
                                        text: ':',
                                        fontSize: 8.5
                                    },
                                    {
                                        text: data.EXP_DATE,
                                        fontSize: 8.5
                                    }
                                    ]
                                ]
                            },
                            layout: {
                                paddingLeft: () => 0,
                                paddingRight: () => 0,
                                paddingTop: () => 0,
                                paddingBottom: () => 0,
                                hLineWidth: function (i, node) {
                                    return 0; // No top border
                                },
                                vLineWidth: function (i, node) {
                                    return 0;
                                },
                                hLineColor: function (i, node) {
                                    return borderColor;
                                },
                                vLineColor: function (i, node) {
                                    return borderColor;
                                }
                            }
                        }
                        ]
                    }
                },
                footer: function (currentPage, pageCount) {
                    return {
                        stack: [{
                            margin: [20, 20, 20, 0],
                            table: {
                                headerRows: 0,
                                widths: ['*'],
                                body: [
                                    [{ text: `Page ${currentPage} of ${pageCount}`, alignment: 'center', border: [false, false, false, false] }],
                                    [{
                                        image: 'footer',
                                        width: 500,
                                        height: 40,
                                        alignment: "center",
                                        border: [false, false, false, false]
                                    }]
                                ]
                            },
                            layout: {
                                paddingLeft: () => 0,
                                paddingRight: () => 0,
                                paddingTop: () => 0,
                                paddingBottom: () => 0,
                                hLineWidth: function (i, node) {
                                    return 0; // No top border
                                },
                                vLineWidth: function (i, node) {
                                    return 0;
                                },
                                hLineColor: function (i, node) {
                                    return borderColor;
                                },
                                vLineColor: function (i, node) {
                                    return borderColor;
                                }
                            }
                        }]
                    }
                },
                content: [
                    {
                        table: {
                            headerRows: 1,
                            keepWithHeaderRows: true,
                            widths: ['5%', '35%', '25%', '10%', '25%'],
                            body: items(data.DATA)
                        },
                        layout: customLayout
                    },
                    {
                        id: 'signatureBlock',
                        table: {
                            headerRows: 0,
                            widths: ['40%', '20%', '40%'],
                            body: [
                                [
                                    (data.PREPARED_SIGN != null) ? {
                                        image: 'prepared_sign',
                                        width: 100,
                                        height: 47
                                    } : {},
                                    {},
                                    (data.APPROVE_SIGN != null) ? {
                                        image: 'approve_sign',
                                        width: 100,
                                        height: 47,
                                        alignment: 'right'
                                    } : {}
                                ], [
                                    (data.PREPARED_BY != null) ? {
                                        text: [
                                            {
                                                text: 'Prepared by : '
                                            },
                                            {
                                                text: data.PREPARED_BY,
                                                bold: true
                                            }
                                        ],
                                        alignment: 'left'
                                    } : {}, {},
                                    (data.APPROVED_BY != null) ? {
                                        text: [
                                            {
                                                text: 'Approved by : '
                                            },
                                            {
                                                text: data.APPROVED_BY,
                                                bold: true
                                            }
                                        ],
                                        alignment: 'right'
                                    } : {}
                                ]
                            ],
                        },
                        layout: {
                            paddingLeft: () => 0,
                            paddingRight: () => 0,
                            paddingTop: () => 0,
                            paddingBottom: () => 0,
                            hLineWidth: function (i, node) {
                                return 0; // No top border
                            },
                            vLineWidth: function (i, node) {
                                return 0;
                            },
                            hLineColor: function (i, node) {
                                return borderColor;
                            },
                            vLineColor: function (i, node) {
                                return borderColor;
                            }
                        },
                        margin: [0, 10, 0, 0]
                    }
                ],
                pageBreakBefore: function (currentNode, followingNodesOnPage, nodesOnNextPage, previousNodesOnPage) {
                    // Ensure that the signature block stays with its preceding content
                    if (currentNode.id === 'signatureBlock' && followingNodesOnPage.length === 0) {
                        return true; // Force page break to keep signature together
                    }
                    // Handle other custom page break logic
                    return false;
                }
            };
}
