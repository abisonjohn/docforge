create or replace PACKAGE BODY docforge AS

  -- API endpoint constant
  c_api_endpoint CONSTANT VARCHAR2(200) := 'https://lightblue-stingray-295802.hostingersite.com/generate';
  
  FUNCTION generate(
    p_json_data   IN CLOB,
    p_template_id IN VARCHAR2
  ) RETURN t_file_response IS
    
    l_http_request   UTL_HTTP.req;
    l_http_response  UTL_HTTP.resp;
    l_request_body   CLOB;
    l_response_blob  BLOB;
    l_buffer         RAW(32767);
    l_amount         NUMBER := 32767;
    l_result         t_file_response;
    l_content_type   VARCHAR2(500);
    l_content_disp   VARCHAR2(500);
    l_file_name      VARCHAR2(500);
    
  BEGIN
    -- Initialize return record
    l_result.status_code := 0;
    l_result.error_message := NULL;
    l_result.mime_type := 'application/pdf';
    l_result.charset := 'binary';
    l_result.file_name := p_template_id || '_' || 
                          TO_CHAR(SYSDATE, 'YYYYMMDD_HH24MISS') || '.pdf';
    
    -- Build JSON request body
    l_request_body := '{' ||
                      '"template": "' || p_template_id || '",' ||
                      '"data": ' || p_json_data ||
                      '}';
    
    -- Set wallet path if using HTTPS (configure as needed)
    -- UTL_HTTP.set_wallet('file:/path/to/wallet', 'wallet_password');
    
    -- Initialize HTTP request
    l_http_request := UTL_HTTP.begin_request(
      url    => c_api_endpoint,
      method => 'POST'
    );
    
    -- Set request headers
    UTL_HTTP.set_header(l_http_request, 'Content-Type', 'application/json');
    UTL_HTTP.set_header(l_http_request, 'Content-Length', DBMS_LOB.getlength(l_request_body));
    
    -- Write request body
    DECLARE
      l_offset NUMBER := 1;
      l_chunk_size NUMBER := 32767;
      l_chunk VARCHAR2(32767);
    BEGIN
      WHILE l_offset <= DBMS_LOB.getlength(l_request_body) LOOP
        l_chunk := DBMS_LOB.substr(l_request_body, l_chunk_size, l_offset);
        UTL_HTTP.write_text(l_http_request, l_chunk);
        l_offset := l_offset + l_chunk_size;
      END LOOP;
    END;
    
    -- Get response
    l_http_response := UTL_HTTP.get_response(l_http_request);
    l_result.status_code := l_http_response.status_code;
    
    -- Check if response is successful
    IF l_result.status_code = 200 THEN
      
      -- Get response headers
      FOR i IN 1..UTL_HTTP.get_header_count(l_http_response) LOOP
        DECLARE
          l_header_name  VARCHAR2(256);
          l_header_value VARCHAR2(1024);
        BEGIN
          UTL_HTTP.get_header(l_http_response, i, l_header_name, l_header_value);
          
          IF UPPER(l_header_name) = 'CONTENT-TYPE' THEN
            l_content_type := l_header_value;
            l_result.mime_type := REGEXP_SUBSTR(l_header_value, '^[^;]+');
          ELSIF UPPER(l_header_name) = 'CONTENT-DISPOSITION' THEN
            l_content_disp := l_header_value;
            -- Extract filename from Content-Disposition header
            l_file_name := REGEXP_SUBSTR(l_header_value, 'filename="([^"]+)"', 1, 1, NULL, 1);
            IF l_file_name IS NOT NULL THEN
              l_result.file_name := l_file_name;
            END IF;
          ELSIF UPPER(l_header_name) = 'CONTENT-LENGTH' THEN
            l_result.content_length := TO_NUMBER(l_header_value);
          END IF;
        END;
      END LOOP;
      
      -- Check if response is actually a PDF
      IF l_result.mime_type NOT LIKE '%pdf%' AND l_result.mime_type NOT LIKE 'application/octet-stream' THEN
        l_result.error_message := 'Unexpected content type received: ' || l_result.mime_type || 
                                  '. Expected PDF file.';
        UTL_HTTP.end_response(l_http_response);
        RETURN l_result;
      END IF;
      
      -- Create temporary BLOB
      DBMS_LOB.createtemporary(l_response_blob, TRUE);
      
      -- Read response body into BLOB
      BEGIN
        LOOP
          UTL_HTTP.read_raw(l_http_response, l_buffer, l_amount);
          DBMS_LOB.writeappend(l_response_blob, UTL_RAW.length(l_buffer), l_buffer);
        END LOOP;
      EXCEPTION
        WHEN UTL_HTTP.end_of_body THEN
          NULL; -- Expected exception when done reading
      END;
      
      -- Check if BLOB is empty
      IF DBMS_LOB.getlength(l_response_blob) = 0 THEN
        l_result.error_message := 'Received empty file from API';
        DBMS_LOB.freetemporary(l_response_blob);
      ELSE
        l_result.file_blob := l_response_blob;
        l_result.content_length := DBMS_LOB.getlength(l_response_blob);
      END IF;
      
    ELSE
      -- Handle non-200 status codes
      l_result.error_message := 'API returned status code ' || l_result.status_code;
      
      -- Try to read error response
      BEGIN
        DECLARE
          l_error_response VARCHAR2(32767);
        BEGIN
          UTL_HTTP.read_text(l_http_response, l_error_response, 32767);
          l_result.error_message := l_result.error_message || ': ' || l_error_response;
        EXCEPTION
          WHEN OTHERS THEN
            NULL;
        END;
      END;
    END IF;
    
    -- Close HTTP response
    UTL_HTTP.end_response(l_http_response);
    
    RETURN l_result;
    
  EXCEPTION
    WHEN UTL_HTTP.request_failed THEN
      l_result.error_message := 'HTTP request failed: ' || SQLERRM;
      l_result.status_code := -1;
      BEGIN
        UTL_HTTP.end_response(l_http_response);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
      RETURN l_result;
      
    WHEN UTL_HTTP.http_server_error THEN
      l_result.error_message := 'HTTP server error: ' || SQLERRM;
      l_result.status_code := -1;
      BEGIN
        UTL_HTTP.end_response(l_http_response);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
      RETURN l_result;
      
    WHEN OTHERS THEN
      l_result.error_message := 'Unexpected error: ' || SQLERRM;
      l_result.status_code := -1;
      BEGIN
        UTL_HTTP.end_response(l_http_response);
      EXCEPTION
        WHEN OTHERS THEN NULL;
      END;
      RETURN l_result;
      
  END generate;

END docforge;
/