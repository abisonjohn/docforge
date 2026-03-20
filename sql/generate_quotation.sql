create procedure generate_quotation (
    p_id IN number,
    p_doc_no IN NUMBER,
    p_doc_date IN varchar2,
    p_cus_account_no IN NUMBER
) as

   l_json         clob;
   l_file_details docforge.t_file_response;
   
begin
   select
      json_object(
         'DOC_PROV_NO' value sd.doc_prov_no,
                  'DOC_NO' value sd.doc_no,
                  'DOC_DATE' value to_char(
            sd.doc_date,
            'DD-MON-YYYY'
         ),
                  'VALID_DATE' value to_char(
            sd.validity,
            'DD-MON-YYYY'
         ),
                  'CURRENCY' value sd.currency,
                  'PAYMENT_TERMS' value coalesce(
            pm.pm_desc,
            sd.payment_terms
         ),
                  'SHIPMENT_TYPE' value coalesce(
            mos.description,
            sd.mode_of_shipment
         ),
                  'INCOTERMS' value coalesce(
            inc.description,
            sd.incoterms
         ),
                  'LEAD_TIME' value sd.doc_item_make,
                  'OW_ID' value sd.ow_id,
                  'MODIFICATION_TERM' value sd.modification_term,
                  'CUS_ACCOUNT_NO' value sd.cus_account_no,
                  'PORT_OF_LOADING' value pol.description,
                  'DESTINATION_PORT' value dp.description,
                  'REMARKS' value sd.remarks,
                  'BANK_DETAILS' value sd.bank_details,
                  'bill_to' value
            json_object(
               'location_name' value bill.customer_location_name,
                        'address1' value bill.customer_address1,
                        'address2' value bill.customer_address2,
                        'city' value bill.customer_city,
                        'state' value bill.customer_state,
                        'country' value bill.customer_country,
                        'postal_code' value bill.customer_postal_code,
                        'gst' value esc.gst_no
            returning clob),
                  'ship_to' value
            json_object(
               'location_name' value ship.customer_location_name,
                        'address1' value ship.customer_address1,
                        'address2' value ship.customer_address2,
                        'city' value ship.customer_city,
                        'state' value ship.customer_state,
                        'country' value ship.customer_country,
                        'postal_code' value ship.customer_postal_code,
                        'gst' value esc.gst_no
            returning clob),
                  'items' value(
            select json_arrayagg(
               json_object(
                  'item_code' value im.im_item_code,
                           'description' value im.im_desc,
                           'item_specification' value sdd.dd_remarks,
                           'hsn_code' value hcm.hsn_code,
                           'qty' value sdd.dd_qty,
                           'uom' value sdd.uom,
                           'dd_sell_price' value sdd.dd_sell_price / sd.exchange_rate,
                           'total' value sdd.dd_sell_price_final / sd.exchange_rate,
                           'taxable_value' value sdd.dd_sell_price_final / sd.exchange_rate,
                           'igst' value nvl(
                     sdd.igst,
                     hcm.igst
                  ),
                           'igst_value' value sdd.igst_value,
                           'cgst' value nvl(
                     sdd.cgst,
                     hcm.cgst
                  ),
                           'cgst_value' value sdd.cgst_value,
                           'sgst' value nvl(
                     sdd.sgst,
                     hcm.sgst
                  ),
                           'sgst_value' value sdd.sgst_value,
                           'grand_total' value sdd.dd_sell_value_final / sd.exchange_rate
               returning clob)
            returning clob)
              from sale_document_details sdd
              join item_master im
            on sdd.im_inv_no = im.im_inv_no
              left join hsn_coding_mapping hcm
            on hcm.im_inv_no = sdd.im_inv_no
             where sdd.doc_prov_no = sd.doc_prov_no
         ),
                  'customer_service_rep' value
            json_object(
               'name' value csr.rep_first_name
                            || ' '
                            || csr.rep_last_name,
                        'email' value csr.rep_email,
                        'phone' value csr.rep_office_phone
            returning clob),
                  'default_sales_rep' value
            json_object(
               'name' value dsr.rep_first_name
                            || ' '
                            || dsr.rep_last_name,
                        'email' value dsr.rep_email,
                        'phone' value dsr.rep_office_phone
            returning clob),
                  'bank_details' value
            json_object(
               'bank_account_type' value bm.bank_account_type,
                        'account_name' value bm.account_name,
                        'bank_name' value bm.bank_name,
                        'account_no' value bm.account_no,
                        'swift_code' value bm.swift_code,
                        'ifsc_code' value bm.ifsc_code,
                        'branch' value bm.branch,
                        'bank_address' value bm.bank_address,
                        'correspondent_bank' value bm.correspondent_bank,
                        'intermediary_bank' value bm.intermediary_bank
            returning clob)
      returning clob)
     into l_json
     from sale_documents sd
     left join payment_modes pm
   on pm.pm_code = sd.payment_terms
     left join mode_of_shipment mos
   on mos.code = sd.mode_of_shipment
     left join incoterms inc
   on inc.code = sd.incoterms
     left join port_of_loading pol
   on pol.code = sd.port_of_loading
     left join destination_port dp
   on dp.code = sd.destination_port
      LEFT JOIN EBA_SALES_CUSTOMER_LOCATIONS ship
             ON sd.OW_ID = ship.ID
      LEFT JOIN EBA_SALES_CUSTOMER_LOCATIONS bill
             ON sd.MODIFICATION_TERM = bill.ID
     left join eba_sales_customers esc
   on esc.id = sd.cus_account_no
     left join eba_sales_salesreps csr
   on csr.id = esc.customer_service_id
      and csr.rep_office = 'Customer Service'
     left join eba_sales_salesreps dsr
   on dsr.id = esc.default_rep_id
     left join bank_master bm
   on bm.id = sd.bank_details
    where sd.doc_no = 36426
      and rownum = 1;

   l_file_details := docforge.generate(
      p_json_data   => l_json,
      p_template_id => 'quotation'
   );

MERGE INTO eba_sales_files t
USING (
    SELECT p_id AS sale_doc_id FROM dual
) s
ON (
       t.sale_doc_id = s.sale_doc_id
   AND t.entity_type = 'SALE_ORDER'
   AND t.tags = 'QUOTE'
)
WHEN MATCHED THEN
    UPDATE SET
        t.filename        = l_file_details.file_name,
        t.file_blob       = l_file_details.file_blob,
        t.file_mimetype   = l_file_details.mime_type,
        t.file_comments   = 'QUOTE NO:' || p_doc_no || ', QUOTE DATE:' || p_doc_date
WHEN NOT MATCHED THEN
    INSERT (
        filename,
        file_blob,
        file_mimetype,
        entity_type,
        sale_doc_id,
        file_comments,
        tags,
        account_id
    )
    VALUES (
        l_file_details.file_name,
        l_file_details.file_blob,
        l_file_details.mime_type,
        'SALE_ORDER',
        p_id,
        'QUOTE NO:' || p_doc_no || ', QUOTE DATE:' || p_doc_date,
        'QUOTE',
        p_cus_account_no
    );
end generate_quotation;