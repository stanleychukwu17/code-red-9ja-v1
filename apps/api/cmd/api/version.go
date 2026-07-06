package main

// add the below to you github ci/cd pipeline during the build
// it will override the default values of version, commit and build_time
// go build -ldflags="
//   -X 'main.version=${VERSION}' \
//   -X 'main.commit=${COMMIT_SHA}' \
// "
var (
	version string = "dev"
	commit  string = "none"
)
