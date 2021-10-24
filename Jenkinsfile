// must be available.
// Most typical, if you're not cloning into a sub directory
sh('git rev-parse HEAD > GIT_COMMIT')
git_commit=readFile('GIT_COMMIT')
// short SHA, possibly better for chat notifications, etc.
short_commit=git_commit.take(6)

//create a GIT_COMMIT file in workspace and read back into a string in Pipeline
// If you have your sources checked out in a 'src' subdir
sh('cd src && git rev-parse HEAD > GIT_COMMIT')
git_commit=readFile('src/GIT_COMMIT')
// short SHA, possibly better for chat notifications, etc.
short_commit=git_commit.take(6)
// 
