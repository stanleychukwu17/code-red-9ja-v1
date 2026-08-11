package main
import (
	"encoding/json"
	"fmt"
)
func main() {
	var alloc map[string]struct {
		Default *int64 `json:"default"`
	}
	j := ` + " `" + `{"pollingAgent":{"states":{},"default":20000},"lgaElectionSupervisor":{"states":{},"default":30000},"wardElectionSupervisor":{"states":{},"default":25000},"stateElectionSupervisor":{"states":{},"default":50000}}` + "` " + `
	if err := json.Unmarshal([]byte(j), &alloc); err != nil {
		fmt.Println("Error:", err)
		return
	}
	for k, v := range alloc {
		if v.Default != nil {
			fmt.Printf("%s: %d\n", k, *v.Default)
		} else {
			fmt.Printf("%s: nil\n", k)
		}
	}
}
