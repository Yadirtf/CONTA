// Respuestas con la forma que devuelve WcfDianCustomerServices (SOAP 1.2, contratos de datos de WCF).
// Los valores son ficticios.

const sobre = (cuerpo: string) =>
  `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:a="http://www.w3.org/2005/08/addressing"><s:Header><a:Action s:mustUnderstand="1">http://wcf.dian.colombia/IWcfDianCustomerServices/Respuesta</a:Action></s:Header><s:Body>${cuerpo}</s:Body></s:Envelope>`;

export const ACUSE_RECIBIDO = sobre(
  `<SendTestSetAsyncResponse xmlns="http://wcf.dian.colombia"><SendTestSetAsyncResult xmlns:b="http://schemas.datacontract.org/2004/07/UploadDocumentResponse" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><b:ErrorMessageList xmlns:c="http://schemas.datacontract.org/2004/07/XmlParamsResponseTrackId"/><b:ZipKey>3f2a6b1c-0000-4000-8000-000000000abc</b:ZipKey></SendTestSetAsyncResult></SendTestSetAsyncResponse>`,
);

export const ACUSE_RECHAZADO = sobre(
  `<SendTestSetAsyncResponse xmlns="http://wcf.dian.colombia"><SendTestSetAsyncResult xmlns:b="http://schemas.datacontract.org/2004/07/UploadDocumentResponse" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><b:ErrorMessageList xmlns:c="http://schemas.datacontract.org/2004/07/XmlParamsResponseTrackId"><c:XmlParamsResponseTrackId><c:DocumentKey/><c:ProcessedMessage>El set de pruebas no existe o ya fue aceptado</c:ProcessedMessage><c:SenderCode>900373076</c:SenderCode><c:Success>false</c:Success><c:XmlFileName>fv09003730760002600000001</c:XmlFileName></c:XmlParamsResponseTrackId></b:ErrorMessageList><b:ZipKey i:nil="true"/></SendTestSetAsyncResult></SendTestSetAsyncResponse>`,
);

const dianResponse = (valida: boolean, codigo: string, descripcion: string, errores: string[]) =>
  sobre(
    `<GetStatusZipResponse xmlns="http://wcf.dian.colombia"><GetStatusZipResult xmlns:b="http://schemas.datacontract.org/2004/07/DianResponse" xmlns:i="http://www.w3.org/2001/XMLSchema-instance"><b:DianResponse><b:ErrorMessage xmlns:c="http://schemas.microsoft.com/2003/10/Serialization/Arrays">${errores
      .map((e) => `<c:string>${e}</c:string>`)
      .join('')}</b:ErrorMessage><b:IsValid>${valida}</b:IsValid><b:StatusCode>${codigo}</b:StatusCode><b:StatusDescription>${descripcion}</b:StatusDescription><b:StatusMessage>La Factura electrónica SETP990000001, ha sido autorizada.</b:StatusMessage><b:XmlBase64Bytes>PEFwcGxpY2F0aW9uUmVzcG9uc2UvPg==</b:XmlBase64Bytes><b:XmlDocumentKey>abc</b:XmlDocumentKey><b:XmlFileName>fv09003730760002600000001</b:XmlFileName></b:DianResponse></GetStatusZipResult></GetStatusZipResponse>`,
  );

export const VALIDACION_ACEPTADA = dianResponse(true, '00', 'Procesado Correctamente.', []);
export const VALIDACION_RECHAZADA = dianResponse(false, '99', 'Validación contiene errores en campos mandatorios.', [
  'Regla: FAD06, Rechazo: Valor del tributo no coincide con la base por la tarifa',
  'Regla: FAK24, Rechazo: No fue informado el elemento',
]);
export const VALIDACION_EN_PROCESO = dianResponse(false, '', 'Batch en proceso de validación.', []);

export const FALLA_DE_SEGURIDAD = `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope"><s:Body><s:Fault><s:Code><s:Value>s:Sender</s:Value></s:Code><s:Reason><s:Text xml:lang="es-CO">An error occurred when verifying security for the message.</s:Text></s:Reason></s:Fault></s:Body></s:Envelope>`;
