cd ~/code/informationgraph/home
coffee --watch --compile --bare -o _attachments/scripts/ -c coffeescript/app/ &
coffee --watch --compile --bare -o vendor/ig/_attachments/ -c coffeescript/ig/ &
coffee --watch --compile --bare -o views/ -c coffeescript/views/ &
