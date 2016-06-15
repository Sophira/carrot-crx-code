all:
	npm run buildWatch

prepareDeploy:
	npm run buildProd
	mv .git ../BE_GIT
	mv node_modules ../BE_NM

restoreFromDeploy:
	mv ../BE_GIT .git 
	mv ../BE_NM node_modules