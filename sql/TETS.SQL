declare
  count_qa number;
begin
  select count(0)
    into count_qa
    from QUALITY_PARAMETER_DETAILS aa
   where (aa.CS_PROV_NO, BATCH_NO) in
         (select bb.ADJ_DOC_NO, bb.BATCH_NO
            from ADJUSTMENT_DETAILS bb, item_master cc
           where bb.IM_INV_NO = cc.IM_INV_NO
             and (bb.BATCH_NO = :P484_BATCH)
          
          )
     and aa.DEP_CODE = GET_DEPARTMENT_NO(nvl(v('APP_USER'), USER))
          and exists (select 1 from ITEM_QUALITY_PARAMETERS iqp where iqp.IM_INV_NO = aa.IM_INV_NO and  iqp.QA_CODE = aa.QA_CODE
and iqp.status='A');
  if count_qa = 0 then
    insert into QUALITY_PARAMETER_DETAILS aaB
      (aaB.cs_prov_no,
       aaB.csd_line_no,
       aaB.im_inv_no,
       aaB.QA_CODE,
       aaB.QA_TEST_RESULT,
       aaB.QA_STATUS,
       aaB.QA_UNIT,
       aab.CUSTOMER_ACCOUNT,
       aab.BATCH_NO)
      (select csd.ADJ_DOC_NO,
              csd.AD_LINE_NO,
              aa.im_inv_no,
              QP.QA_CODE,
              null,
              null,
              null,
              csd.CUSTOMER_ACCOUNT,
              csd.batch_no
         from item_master             aa,
              QUALITY_PARAMETERS      qa,
              ADJUSTMENT_DETAILS      csd,
              ITEM_QUALITY_PARAMETERS QP
        where csd.batch_no = :P484_BATCH
          and aa.im_inv_no = csd.im_inv_no
          and aa.im_inv_no = QP.im_inv_no
          and qa.QA_CODE = QP.QA_CODE
          and qa.DEP_CODE = GET_DEPARTMENT_NO(nvl(v('APP_USER'), USER))
          and qa.DEP_CODE = aa.DEP_CODE
          and qa.DEP_CODE = csd.DEP_CODE
          and qa.DEP_CODE = qp.DEP_CODE
          and csd.DEP_CODE = aa.DEP_CODE
          and csd.DEP_CODE = qp.DEP_CODE
          and qp.DEP_CODE = aa.DEP_CODE
          and qp.status='A');
  else
  
    insert into QUALITY_PARAMETER_DETAILS aaB
      (aaB.cs_prov_no,
       aaB.csd_line_no,
       aaB.im_inv_no,
       aaB.QA_CODE,
       aaB.QA_TEST_RESULT,
       aaB.QA_STATUS,
       aaB.QA_UNIT,
       aab.CUSTOMER_ACCOUNT,
       aab.BATCH_NO)
      (select csd.ADJ_DOC_NO,
              csd.AD_LINE_NO,
              aa.im_inv_no,
              QP.QA_CODE,
              null,
              null,
              null,
              csd.CUSTOMER_ACCOUNT,
              csd.batch_no
         from item_master             aa,
              QUALITY_PARAMETERS      qa,
              ADJUSTMENT_DETAILS      csd,
              ITEM_QUALITY_PARAMETERS QP
        where csd.batch_no = :P484_BATCH
          and aa.im_inv_no = csd.im_inv_no
          and aa.im_inv_no = QP.im_inv_no
          and qa.QA_CODE = QP.QA_CODE
          and qa.DEP_CODE = GET_DEPARTMENT_NO(nvl(v('APP_USER'), USER))
          and qa.DEP_CODE = aa.DEP_CODE
          and qa.DEP_CODE = csd.DEP_CODE
          and qa.DEP_CODE = qp.DEP_CODE
          and csd.DEP_CODE = aa.DEP_CODE
          and csd.DEP_CODE = qp.DEP_CODE
          and qp.DEP_CODE = aa.DEP_CODE
          and qp.status='A'
          and not exists (select 1
                 from QUALITY_PARAMETER_DETAILS qq
                where qq.IM_INV_NO = csd.IM_INV_NO
                  and qq.QA_CODE = qa.QA_CODE
                  and csd.BATCH_NO =qq.BATCH_NO));

  delete from    QUALITY_PARAMETER_DETAILS qpd
                           where  exists ( select 1 from ITEM_QUALITY_PARAMETERS qp
 where qp.IM_INV_NO = qpd.IM_INV_NO
  and qp.QA_CODE =qpd.QA_CODE
  and nvl(qp.STATUS,'I')='I')
    and qpd.BATCH_NO  = :P484_BATCH
    and nvl (QA_STATUS,1) <> 3;
  end if;
end;
