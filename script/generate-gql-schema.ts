import { GenerateOptions, GraphQLDefinitionsFactory } from '@nestjs/graphql';
import * as fs from 'fs';
import { join } from 'path';

import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import { print } from 'graphql';

// 1. graphql file to dto file
interface IReadModule {
  path: string;
  name: string;
}

const getSrcModule = (): IReadModule[] => {
  try {
    const srcPath: string = join(process.cwd(), 'src/module');
    const moduleList: string[] = fs.readdirSync(srcPath);

    const readModuleInfoList: IReadModule[] = moduleList
      .filter(
        (moduleName: string) =>
          fs.statSync(join(srcPath, moduleName)).isDirectory() &&
          fs.existsSync(join(srcPath, moduleName, 'model')) &&
          fs
            .readdirSync(join(srcPath, moduleName, `model`))
            .filter(
              (name) =>
                (name.includes('.gql') || name.includes('.graphql')) &&
                fs
                  .readFileSync(
                    join(srcPath, moduleName, 'model', name),
                    'utf8',
                  )
                  .toString(),
            ).length,
      )
      .map((moduleName: string) => ({
        path: join(srcPath, moduleName, 'model'),
        name: moduleName,
      }));

    console.log('readModuleInfoList', readModuleInfoList);
    return readModuleInfoList;
  } catch (err) {
    throw err;
  }
};

const generateGraphqlSchema = async (path: string, moduleName: string) => {
  try {
    const graphQLDefinitionsFactory = new GraphQLDefinitionsFactory();
    const definitionsOptions: GenerateOptions = {
      typePaths: [`${path}/*.*.{graphql,gql}`],
      path: `${path}/${moduleName}.dto.ts`,
      outputAs: 'class',
    };

    await graphQLDefinitionsFactory.generate(definitionsOptions);

    console.log(`💡 Successfully generated ${moduleName}.dto.ts file`);
  } catch (err) {
    throw err;
  }
};

getSrcModule().forEach(
  async (moduleInfo: IReadModule) =>
    await generateGraphqlSchema(moduleInfo.path, moduleInfo.name),
);

// 2. merge graphql files to one file
const typesArray = loadFilesSync([
  join(process.cwd(), 'src/**/**/**/*.{graphql,gql}'),
]);

const typeDefs = mergeTypeDefs(typesArray);

const distPath = join(process.cwd(), 'dist/src');
const localPath = join(process.cwd(), 'src');

if (fs.existsSync(distPath)) {
  fs.writeFileSync(join(distPath, 'schema.graphql'), print(typeDefs));
}
fs.writeFileSync(join(localPath, 'schema.graphql'), print(typeDefs));
