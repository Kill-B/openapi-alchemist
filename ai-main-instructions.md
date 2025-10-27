Este repositório é um fork do LucyBot-Inc/api-spec-converter.

Objetivo do fork:

* Reduzir totalmente o escopo do projeto para apenas duas funcionalidades que eu realmente uso em produção.
* Remover todo o código morto, conversores que eu não uso e dependências desnecessárias.

Funcionalidades que DEVEM permanecer e funcionar:

1. Conversão de OpenAPI 3 -> Swagger 2 (OpenAPI 2)

   * Entrada: arquivo OpenAPI 3 (YAML ou JSON)
   * Saída: arquivo Swagger 2 (YAML)
   * É exatamente isso que hoje eu faço chamando apiConverter.convert({ from: 'openapi_3', to: 'swagger_2', ... })

2. Conversão de OpenAPI 3 JSON -> OpenAPI 3 YAML

   * Entrada: especificação OpenAPI 3 em JSON
   * Saída: a mesma especificação em YAML (mantendo semanticamente igual)
   * Essa conversão não precisa fazer transformação de schema, só mudança de formato (JSON -> YAML), preservando a ordem mais humana (order: 'openapi' se aplicável).

Qualquer outra coisa pode/deve ser deletada:

* Suporte a outras versões de spec que não sejam OpenAPI 3 e Swagger 2.
* Conversores para RAML, API Blueprint, WSDL, etc.
* CLI/features que não sejam necessárias para as duas conversões acima.
* Middlewares, helpers e parsers que não são usados nesses dois fluxos.
* Testes relacionados a formatos que não vamos mais suportar.
* Tipos/helpers expostos só para features removidas.

Regras:

* Manter uma API de uso parecida com a atual para não quebrar meu consumo. Exemplo de uso atual:

  await apiConverter.convert(
  {
  sintax: 'yaml',
  order: 'openapi',
  from: 'openapi_3',
  to: 'swagger_2',
  source: `./open-api/v3.${env.toLowerCase()}.yaml`,
  },
  function (err, converted) {
  if (err) {
  customLogger.info(`Error converting ${env} file`);
  customLogger.error(err);
  return;
  }
  const yamlString = YAML.stringify(converted.spec);
  fs.writeFileSync(`./open-api/v2.${env.toLowerCase()}.yaml`, yamlString);
  fs.unlinkSync(`open-api/v3.${env.toLowerCase()}.yaml`);
  customLogger.info(`Done - converted file for ${env}!`);
  },
  );

* Se algo hoje é necessário para esse fluxo rodar, mantém.

* Se não é necessário para esse fluxo rodar, remove.

* É permitido (e desejado) renomear, reorganizar pastas, e simplificar código interno, contanto que:

  * a função pública continue existindo (ex.: apiConverter.convert(...) ou equivalente estável).
  * ou exista um adaptador fino que mantenha assinatura compatível.

Dependências:

* Se alguma dependência do projeto original só existe para lidar com formatos que não vamos mais suportar, ela pode/deve ser removida do package.json.
* Atualizar package.json para refletir o escopo mínimo.

Resultado esperado:

* Um package pequeno, focado, moderno, fácil de dar manutenção.
* Só dois caminhos felizes: (1) OpenAPI3->Swagger2 e (2) OpenAPI3 JSON->YAML OpenAPI3.
